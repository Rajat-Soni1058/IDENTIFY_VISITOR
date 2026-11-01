import 'package:client/services/vistitor_auth_service.dart';
import 'package:flutter/material.dart';
import 'package:client/auth/role_selection_screen.dart';
import 'package:client/features/guard/home/guardHome.dart';
import 'package:client/features/visitor/home/homeScreen.dart';
import 'package:client/services/common_auth_service.dart';

class CommonAuthGate extends StatelessWidget {
  const CommonAuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String?>(
      future: CommonAuthService.getActiveRole(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError) {
          return const Scaffold(
            body: Center(
              child: Text('Unable to check login status'),
            ),
          );
        }

        if (snapshot.data == 'guard') {
          return const Guardhome();
        }

        if (snapshot.data == 'visitor') {
          return FutureBuilder<String?>(
            future: AuthService.getToken(),
            builder: (context, tokenSnapshot) {
              if (tokenSnapshot.connectionState ==
                  ConnectionState.waiting) {
                return const Scaffold(
                  body: Center(child: CircularProgressIndicator()),
                );
              }

              if (tokenSnapshot.hasError ||
                  tokenSnapshot.data == null ||
                  tokenSnapshot.data!.isEmpty) {
                return const RoleSelectionScreen();
              }

              return Homescreen(
                token: tokenSnapshot.data!,
              );
            },
          );
        }

        return const RoleSelectionScreen();
      },
    );
  }
}