import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../services/api_client.dart';

class AuthenticatedImage extends StatefulWidget {
  final String imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget? placeholder;
  final Widget? errorWidget;

  const AuthenticatedImage({
    super.key,
    required this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.placeholder,
    this.errorWidget,
  });

  @override
  State<AuthenticatedImage> createState() => _AuthenticatedImageState();
}

class _AuthenticatedImageState extends State<AuthenticatedImage> {
  Future<Dio>? _dioFuture;

  @override
  void initState() {
    super.initState();
    _initializeDio();
  }

  void _initializeDio() {
    _dioFuture = _createAuthenticatedDio();
  }

  Future<Dio> _createAuthenticatedDio() async {
    final apiClient = await ApiClient.getWorkOrderServiceClient();
    return apiClient.dio; // Expose the configured Dio instance
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Dio>(
      future: _dioFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildPlaceholder();
        }

        if (snapshot.hasError || !snapshot.hasData) {
          return _buildErrorWidget();
        }

        return FutureBuilder<Response<List<int>>>(
          future: _loadImageData(snapshot.data!),
          builder: (context, imageSnapshot) {
            if (imageSnapshot.connectionState == ConnectionState.waiting) {
              return _buildPlaceholder();
            }

            if (imageSnapshot.hasError || !imageSnapshot.hasData) {
              return _buildErrorWidget();
            }

            final imageData = imageSnapshot.data!.data!;
            return Image.memory(
              Uint8List.fromList(imageData),
              width: widget.width,
              height: widget.height,
              fit: widget.fit,
              errorBuilder: (context, error, stackTrace) => _buildErrorWidget(),
            );
          },
        );
      },
    );
  }

  Future<Response<List<int>>> _loadImageData(Dio dio) async {
    try {
      final response = await dio.get<List<int>>(
        widget.imageUrl,
        options: Options(
          responseType: ResponseType.bytes,
          receiveTimeout: const Duration(seconds: 30),
        ),
      );
      return response;
    } catch (e) {
      rethrow;
    }
  }

  Widget _buildPlaceholder() {
    return widget.placeholder ??
        Container(
          width: widget.width,
          height: widget.height,
          color: Colors.grey.shade200,
          child: const Center(
            child: SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        );
  }

  Widget _buildErrorWidget() {
    return widget.errorWidget ??
        Container(
          width: widget.width,
          height: widget.height,
          color: Colors.grey.shade200,
          child: const Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error, color: Colors.red, size: 24),
              SizedBox(height: 4),
              Text(
                '加载失败',
                style: TextStyle(fontSize: 10, color: Colors.red),
              ),
            ],
          ),
        );
  }
}