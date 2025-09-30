import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../shared/models/work_order.dart';
import '../../shared/services/work_order_service.dart';
import '../../shared/services/offline_storage_service.dart';
import '../../shared/providers/auth_provider.dart';
import '../../shared/utils/connectivity_helper.dart';

class WorkOrderCompletionScreen extends StatefulWidget {
  final WorkOrderWithRelations workOrder;

  const WorkOrderCompletionScreen({
    super.key,
    required this.workOrder,
  });

  @override
  State<WorkOrderCompletionScreen> createState() => _WorkOrderCompletionScreenState();
}

class _WorkOrderCompletionScreenState extends State<WorkOrderCompletionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _solutionController = TextEditingController();
  FaultCode? _selectedFaultCode;
  final List<String> _selectedPhotos = [];
  bool _isSubmitting = false;
  final ImagePicker _imagePicker = ImagePicker();

  @override
  void dispose() {
    _solutionController.dispose();
    super.dispose();
  }

  Future<void> _pickImageFromCamera() async {
    try {
      // Check photo limit before capturing
      if (_selectedPhotos.length >= 5) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('最多只能上传5张照片'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      final XFile? photo = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
        requestFullMetadata: false, // Reduce metadata to avoid issues
      );

      if (photo != null) {
        setState(() {
          _selectedPhotos.add(photo.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('拍照失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _pickImageFromGallery() async {
    try {
      // Check photo limit before selecting
      final remainingSlots = 5 - _selectedPhotos.length;
      if (remainingSlots <= 0) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('最多只能上传5张照片'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      final List<XFile> photos = await _imagePicker.pickMultiImage(
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );

      if (photos.isNotEmpty) {
        final photosToAdd = photos.take(remainingSlots).map((photo) => photo.path).toList();
        setState(() {
          _selectedPhotos.addAll(photosToAdd);
        });

        if (photos.length > remainingSlots && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('已选择${photosToAdd.length}张照片，超出部分已忽略（最多5张）'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('选择照片失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _removePhoto(int index) {
    setState(() {
      _selectedPhotos.removeAt(index);
    });
  }

  void _showPhotoSourceDialog() {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: const Text('拍照'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImageFromCamera();
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('从相册选择'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImageFromGallery();
                },
              ),
              ListTile(
                leading: const Icon(Icons.cancel),
                title: const Text('取消'),
                onTap: () => Navigator.pop(context),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _submitCompletion() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final authProvider = context.read<AuthProvider>();
      final currentUser = authProvider.user;
      
      if (currentUser == null) {
        throw Exception('用户未登录');
      }

      // Check network connectivity
      final isOnline = await ConnectivityHelper.isConnected();

      if (isOnline) {
        // Submit online
        await _submitOnline();
      } else {
        // Save offline
        await _submitOffline();
      }

      if (mounted) {
        Navigator.of(context).pop(true); // Return true to indicate success
      }
    } catch (e) {
      setState(() {
        _isSubmitting = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('提交失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _submitOnline() async {
    final workOrderService = await WorkOrderService.getInstance();
    
    try {
      // Step 1: Upload photos FIRST if any (this is critical)
      if (_selectedPhotos.isNotEmpty) {
        debugPrint('Uploading ${_selectedPhotos.length} photos before completing work order...');
        
        // Convert any HEIC photos to JPEG first
        final convertedPhotos = await _convertPhotosToJpeg(_selectedPhotos);
        
        // Upload both as resolution photos and work order photos
        await Future.wait([
          workOrderService.uploadResolutionPhotos(
            widget.workOrder.id,
            convertedPhotos,
          ),
          workOrderService.uploadWorkOrderPhotos(
            widget.workOrder.id,
            convertedPhotos,
          ),
        ]);
        
        debugPrint('Photos uploaded successfully');
      }

      // Step 2: Only complete work order AFTER photos are uploaded successfully
      final request = CreateResolutionRequest(
        solutionDescription: _solutionController.text.trim(),
        faultCode: _selectedFaultCode,
      );

      debugPrint('Completing work order...');
      await workOrderService.completeWorkOrder(widget.workOrder.id, request);
      debugPrint('Work order completed successfully');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('工单完成成功'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      debugPrint('Error in _submitOnline: $e');
      // Re-throw to be handled by the calling method
      rethrow;
    }
  }

  /// Convert HEIC photos to JPEG format for better server compatibility
  Future<List<String>> _convertPhotosToJpeg(List<String> photoPaths) async {
    final convertedPaths = <String>[];
    
    for (final photoPath in photoPaths) {
      try {
        final file = File(photoPath);
        final fileName = file.uri.pathSegments.last;
        final extension = fileName.contains('.') 
            ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
            : '';
        
        // Check if photo is HEIC/HEIF format
        if (extension == '.heic' || extension == '.heif') {
          debugPrint('Converting HEIC photo to JPEG: $photoPath');
          
          // Create a new path with .jpg extension
          final directory = file.parent.path;
          final fileName = file.uri.pathSegments.last;
          final baseName = fileName.contains('.') 
              ? fileName.substring(0, fileName.lastIndexOf('.'))
              : fileName;
          final jpegPath = '$directory${Platform.pathSeparator}${baseName}_converted.jpg';
          
          // Read and decode the image file
          try {
            final imageBytes = await file.readAsBytes();
            final image = img.decodeImage(imageBytes);
            
            if (image != null) {
              // Resize image if too large to reduce file size
              img.Image resizedImage = image;
              if (image.width > 1920 || image.height > 1920) {
                resizedImage = img.copyResize(image, 
                  width: image.width > image.height ? 1920 : null,
                  height: image.height > image.width ? 1920 : null);
              }
              
              // Encode to JPEG with quality
              final jpegBytes = img.encodeJpg(resizedImage, quality: 85);
              final jpegFile = File(jpegPath);
              await jpegFile.writeAsBytes(jpegBytes);
              
              debugPrint('Successfully converted HEIC to JPEG: $jpegPath');
              convertedPaths.add(jpegPath);
            } else {
              debugPrint('Failed to decode image: $photoPath');
              convertedPaths.add(photoPath);
            }
          } catch (conversionError) {
            debugPrint('Failed to convert HEIC photo: $conversionError');
            // If conversion fails, try using the original file
            convertedPaths.add(photoPath);
          }
        } else {
          // Photo is already in a supported format
          convertedPaths.add(photoPath);
        }
      } catch (e) {
        debugPrint('Error processing photo $photoPath: $e');
        // Include the original photo path even if there's an error
        convertedPaths.add(photoPath);
      }
    }
    
    return convertedPaths;
  }

  Future<void> _submitOffline() async {
    final offlineStorage = OfflineStorageService.getInstance();
    
    // Convert photos to JPEG format first, then save to local storage
    final List<String> localPhotoPaths = [];
    if (_selectedPhotos.isNotEmpty) {
      final convertedPhotos = await _convertPhotosToJpeg(_selectedPhotos);
      for (final photoPath in convertedPhotos) {
        final localPath = await offlineStorage.savePhotoToLocal(
          photoPath,
          widget.workOrder.id,
        );
        localPhotoPaths.add(localPath);
      }
    }

    // Create offline resolution record
    final offlineResolution = OfflineResolutionRecord(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      workOrderId: widget.workOrder.id,
      solutionDescription: _solutionController.text.trim(),
      faultCode: _selectedFaultCode,
      photoLocalPaths: localPhotoPaths,
      createdAt: DateTime.now(),
      isSynced: false,
    );

    // Save offline resolution
    await offlineStorage.saveOfflineResolution(offlineResolution);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('工单已离线保存，将在联网时同步'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('完成工单'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: _isSubmitting ? null : _submitCompletion,
            child: Text(
              _isSubmitting ? '提交中...' : '提交',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildWorkOrderSummary(),
              const SizedBox(height: 24),
              _buildSolutionDescriptionField(),
              const SizedBox(height: 24),
              _buildFaultCodeSelector(),
              const SizedBox(height: 24),
              _buildPhotoSection(),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWorkOrderSummary() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '工单信息',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              widget.workOrder.title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              widget.workOrder.description,
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Text('设备: ', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(widget.workOrder.asset.name),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSolutionDescriptionField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '解决方案描述 *',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _solutionController,
          maxLines: 5,
          decoration: const InputDecoration(
            hintText: '请详细描述解决方案和维修过程...',
            border: OutlineInputBorder(),
          ),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return '请输入解决方案描述';
            }
            if (value.trim().length < 10) {
              return '解决方案描述至少需要10个字符';
            }
            return null;
          },
          maxLength: 1000,
        ),
      ],
    );
  }

  Widget _buildFaultCodeSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '故障代码',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey),
            borderRadius: BorderRadius.circular(4),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<FaultCode>(
              value: _selectedFaultCode,
              hint: const Text('选择故障代码（可选）'),
              isExpanded: true,
              items: FaultCode.values.map((code) {
                return DropdownMenuItem<FaultCode>(
                  value: code,
                  child: Text(code.displayName),
                );
              }).toList(),
              onChanged: (FaultCode? value) {
                setState(() {
                  _selectedFaultCode = value;
                });
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPhotoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              '完成照片',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton.icon(
              onPressed: _showPhotoSourceDialog,
              icon: const Icon(Icons.add_a_photo),
              label: const Text('添加照片'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_selectedPhotos.isEmpty)
          Container(
            width: double.infinity,
            height: 120,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.photo_camera,
                  size: 48,
                  color: Colors.grey.shade400,
                ),
                const SizedBox(height: 8),
                Text(
                  '添加完成照片作为维修证明',
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ],
            ),
          )
        else
          _buildPhotoGrid(),
      ],
    );
  }

  Widget _buildPhotoGrid() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 1,
      ),
      itemCount: _selectedPhotos.length,
      itemBuilder: (context, index) {
        return Stack(
          children: [
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                image: DecorationImage(
                  image: FileImage(File(_selectedPhotos[index])),
                  fit: BoxFit.cover,
                ),
              ),
            ),
            Positioned(
              top: 4,
              right: 4,
              child: GestureDetector(
                onTap: () => _removePhoto(index),
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.close,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}