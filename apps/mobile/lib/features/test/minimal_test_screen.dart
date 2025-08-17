import 'package:flutter/material.dart';

class MinimalTestScreen extends StatelessWidget {
  const MinimalTestScreen({super.key});

  @override
  Widget build(BuildContext context) {
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('最小测试页面'),
        backgroundColor: Colors.purple,
        foregroundColor: Colors.white,
      ),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.check_circle,
                size: 100,
                color: Colors.green,
              ),
              SizedBox(height: 24),
              Text(
                '测试页面加载成功！',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 16),
              Text(
                '如果你能看到这个页面，说明基本导航功能正常。',
                style: TextStyle(fontSize: 16),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}