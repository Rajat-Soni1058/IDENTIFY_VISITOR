import 'package:client/auth/common_authGate.dart';
import 'package:client/services/guard_auth_service.dart';
import 'package:flutter/material.dart';

class Guardhome extends StatelessWidget {
  const Guardhome({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text("Guard HOme screen"),
        ElevatedButton(onPressed: ()async{
          await GuardAuthService.logout();
          Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_)=>CommonAuthGate()), (route)=> false);
        }, child:Text("LOgout"))
      ],
    ));
  }
}
