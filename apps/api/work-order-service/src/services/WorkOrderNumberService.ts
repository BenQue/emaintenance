import { PrismaClient } from '@emaintenance/database';

export class WorkOrderNumberService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a new work order number in format MO{YYYY}{NNNNN}
   * @returns Promise<string> Work order number
   */
  async generateWorkOrderNumber(): Promise<string> {
    // Use Asia/Shanghai timezone for consistent year determination
    const now = new Date();
    const shanghaiTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric'
    }).format(now);
    const year = parseInt(shanghaiTime);
    
    return await this.prisma.$transaction(async (tx) => {
      // Use upsert to handle race condition in sequence creation
      const sequence = await tx.workOrderSequence.upsert({
        where: { year },
        update: {},
        create: { year, sequence: 0 }
      });
      
      // Check for sequence overflow before incrementing
      if (sequence.sequence >= 99999) {
        throw new Error(`Work order sequence overflow for year ${year}. Maximum 99,999 work orders per year.`);
      }
      
      // Increment sequence number
      const updatedSequence = await tx.workOrderSequence.update({
        where: { year },
        data: { 
          sequence: { increment: 1 },
          lastUpdated: new Date()
        }
      });
      
      // Generate work order number with 5-digit padded sequence
      const paddedSequence = updatedSequence.sequence.toString().padStart(5, '0');
      return `MO${year}${paddedSequence}`;
    });
  }

  /**
   * Initialize current year sequence if it doesn't exist
   */
  async initializeCurrentYearSequence(): Promise<void> {
    // Use Asia/Shanghai timezone for consistent year determination
    const now = new Date();
    const shanghaiTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric'
    }).format(now);
    const year = parseInt(shanghaiTime);
    
    await this.prisma.workOrderSequence.upsert({
      where: { year },
      update: {},
      create: { year, sequence: 0 }
    });
  }

  /**
   * Get current sequence number for a given year
   * @param year Year to check
   * @returns Current sequence number
   */
  async getCurrentSequence(year: number): Promise<number> {
    const sequence = await this.prisma.workOrderSequence.findUnique({
      where: { year }
    });
    
    return sequence?.sequence || 0;
  }
}