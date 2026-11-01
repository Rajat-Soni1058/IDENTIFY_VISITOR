import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class CommonAuthService {
  static const FlutterSecureStorage _storage =
      FlutterSecureStorage();

  static const String _activeRoleKey = 'activeRole';

  // Call after successful visitor login/signup.
  static Future<void> setVisitorSession() async {
    // Remove previous guard session.
    await _storage.delete(key: 'guardToken');
    await _storage.delete(key: 'guardProfile');
    await _storage.delete(key: 'guardName');

    // Mark visitor as the active account.
    await _storage.write(
      key: _activeRoleKey,
      value: 'visitor',
    );
  }

  // Call after successful guard login/signup.
  static Future<void> setGuardSession() async {
    // Remove previous visitor session.
    await _storage.delete(key: 'token');
    await _storage.delete(key: 'visitorProfile');
    await _storage.delete(key: 'visitorName');

    // Mark guard as the active account.
    await _storage.write(
      key: _activeRoleKey,
      value: 'guard',
    );
  }

  // Get currently logged-in role.
  static Future<String?> getActiveRole() async {
    final role = await _storage.read(key: _activeRoleKey);

    if (role == 'guard') {
      final token = await _storage.read(key: 'guardToken');

      if (token != null && token.isNotEmpty) {
        return 'guard';
      }
    }

    if (role == 'visitor') {
      final token = await _storage.read(key: 'token');

      if (token != null && token.isNotEmpty) {
        return 'visitor';
      }
    }

    // No valid local session.
    await _storage.delete(key: _activeRoleKey);
    return null;
  }

  // Logout from the application.
  static Future<void> logout() async {
    await _storage.delete(key: 'token');
    await _storage.delete(key: 'visitorProfile');
    await _storage.delete(key: 'visitorName');

    await _storage.delete(key: 'guardToken');
    await _storage.delete(key: 'guardProfile');
    await _storage.delete(key: 'guardName');

    await _storage.delete(key: _activeRoleKey);
  }
}