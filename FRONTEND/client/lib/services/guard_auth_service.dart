import 'dart:convert';

import 'package:client/services/common_auth_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class GuardAuthService {
  static const String baseUrl = 'http://10.0.2.2:5000';
  static const storage = FlutterSecureStorage();

//SINGUP
  static Future<Map<String,dynamic>> signup({
    required String name,
    required String email,
    required String password,
    required String phoneNumber,
    required String address,
    int? age,
    String? gender,
    String? employeeId,
    String? organizationCode,
  })async{
    final response = await http.post(Uri.parse('$baseUrl/security_guard/signup'),
    headers: {
      'Content-Type': 'application/json'
    },
    body:  jsonEncode({
        'name': name,
        'email': email,
        'password': password,
        'phoneNumber': phoneNumber,
        'address': address,
        if (age != null) 'age': age,
        if (gender != null) 'gender': gender,
        if (employeeId != null) 'employeeId': employeeId,
        if (organizationCode != null)
          'organizationCode': organizationCode,
      }),
    );

    final data = jsonDecode(response.body);

    if(response.statusCode != 201){
      throw Exception(data['message'] ?? 'Signup failed');
    }

    await _saveAuthData(data);

    return data;
  }



//LOGIN
 static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/security_guard/signin'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    final data = jsonDecode(response.body);

    if (response.statusCode != 200) {
      throw Exception(data['message'] ?? 'Login failed');
    }

    await _saveAuthData(data);

    return data;
  }


  //SAVE TOKEN AND PROFILE
static Future<void> _saveAuthData(
  Map<String, dynamic> data,
) async {
  final token = data['token'];
  final guard = data['guard'];

  if (token == null || guard == null) {
    throw Exception('Invalid server response');
  }

  await storage.write(
    key: 'guardToken',
    value: token.toString(),
  );

  await saveProfile(
    Map<String, dynamic>.from(guard),
  );

  await CommonAuthService.setGuardSession();
}

  //SAVE PROFILE
  static Future<void> saveProfile(
    Map<String, dynamic> guard,
  ) async {
    await storage.write(
      key: 'guardProfile',
      value: jsonEncode(guard),
    );

    final name = guard['name'];

    if (name != null) {
      await storage.write(
        key: 'guardName',
        value: name.toString(),
      );
    }
  }

  //GET PROFILE

  static Future<Map<String, dynamic>?> getProfile() async {
    final data = await storage.read(
      key: 'guardProfile',
    );

    if (data == null) return null;

    return Map<String, dynamic>.from(
      jsonDecode(data),
    );
  }

  //GET TOKEN

  static Future<String?> getToken() async {
    return await storage.read(
      key: 'guardToken',
    );
  }

  //LOGOUT

static Future<void> logout() async {
  await CommonAuthService.logout();
}
}