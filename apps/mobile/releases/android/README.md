# Android Release Builds

## Latest Release

### Version: v1.0.0
**Date:** 2025-08-29  
**File:** `emaintenance-v1.0.0-20250829.apk`  
**Size:** 35.1MB

### Configuration
- **Production Server:** http://10.163.144.13:3030
- **Minimum Android Version:** Android 5.0 (API level 21)
- **Target Android Version:** Android 14 (API level 34)

### Key Features
- ✅ Production server configuration
- ✅ HTTP cleartext traffic support for internal server
- ✅ Extended network timeout (30 seconds)
- ✅ JWT-based authentication
- ✅ QR code scanning for assets
- ✅ Work order management
- ✅ Offline support with local storage

### Installation Instructions

1. **Enable Unknown Sources**
   - Go to Settings → Security
   - Enable "Install unknown apps" for your file manager

2. **Install APK**
   - Transfer the APK file to your Android device
   - Open the file using a file manager
   - Tap "Install" when prompted

3. **Grant Permissions**
   - Camera: Required for QR code scanning
   - Network: Required for server communication

### Network Requirements
- Device must be connected to the same network as server (10.163.144.13)
- Port 3030 must be accessible
- Firewall should allow HTTP traffic

### Troubleshooting

**Cannot connect to server:**
- Verify device is on the correct network
- Check if you can ping 10.163.144.13 from the device
- Ensure all backend services are running on the server

**Installation blocked:**
- Make sure "Install unknown apps" is enabled
- Check if device has enough storage space (minimum 100MB)

**App crashes on startup:**
- Clear app data and cache
- Reinstall the application
- Check Android version compatibility (minimum Android 5.0)

### Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0.0 | 2025-08-29 | - Initial production release<br>- Configured for server 10.163.144.13:3030<br>- Added network security configuration<br>- Extended timeout settings |