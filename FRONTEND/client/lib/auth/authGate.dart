import 'package:client/auth/loginScreen.dart';
import 'package:client/features/home/homeScreen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  static const storage = FlutterSecureStorage();


  Future<Map<String,String?>> getSavedData() async{
    final token = await storage.read(key: 'token');
    final visitorName = await storage.read(key: 'visitorName');
    return {
      'token': token,
      'visitorName': visitorName,
    };
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, String?>>(future: getSavedData(), builder: (context,snapshot){
      if(snapshot.connectionState == ConnectionState.waiting){
        return const Scaffold(
          body: Center(
            child: CircularProgressIndicator(),
          ),
        );
      }
      final token = snapshot.data?['token'];
      if(token!= null && token.isNotEmpty){
        return Homescreen(token: token,);
      }

      return const LoginScreen();
    });
  }
}