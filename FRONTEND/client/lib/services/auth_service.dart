import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class AuthService {
  // static const String baseUrl = 'http://localhost:5000';
  static const String baseUrl = 'http://10.0.2.2:5000';

  static const storage = FlutterSecureStorage();

  //LOGIN
  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/permanent_visitor/signin'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode != 200) {
      throw Exception(data['error'] ?? 'Login failed');
    }

    await storage.write(key: 'token', value: data['token']);
    await storage.write(
      key: 'visitorName',
      value: data['visitor']['name'] ?? 'Visitor',
    );
    await saveProfile(Map<String, dynamic>.from(data['visitor']));
print(data['visitor']);

    return data;
  }

  //SIGNUP
  static Future<Map<String, dynamic>> signup({
    required String name,
    required String email,
    required String password,
    required String identityNumber,
    required int age,
    required String gender,
    required String phoneNumber,
    required String purpose,
    required String address,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/permanent_visitor/signup'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'email': email,
        'password': password,
        'identityNumber': identityNumber,
        'age': age,
        'gender': gender,
        'phoneNumber': phoneNumber,
        'purpose': purpose,
        'address': address,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode != 201) {
      throw Exception(data['error'] ?? data['message'] ?? 'Signup failed');
    }

    await storage.write(key: 'token', value: data['token']);
    await storage.write(
      key: 'visitorName',
      value: data['visitor']['name'] ?? 'Visitor',
    );
    await saveProfile(Map<String, dynamic>.from(data['visitor']));
    return data;
  }

  //SAVE PROFILE in local storage
  static Future<void> saveProfile(Map<String, dynamic> visitor) async {
    await storage.write(key: 'visitorProfile', value: jsonEncode(visitor));
    final name = visitor['name'];
    if (name != null && name.toString().trim().isNotEmpty) {
      await storage.write(key: 'visitorName', value: name.toString());
    }
  }

  //FETCH THE PROFILE from local storage
  static Future<Map<String, dynamic>?> getProile() async {
    final data = await storage.read(key: 'visitorProfile');
    if (data == null) return null;
    return Map<String, dynamic>.from(jsonDecode(data));
  }

  //CLEAR THE DATA from local storage
  static Future<void> clearAll() async {
    await storage.deleteAll();
  }

  //UPDATE PROFILE
  static Future<Map<String, dynamic>> updateInfo({
    required String address,
    required String name,
    required String email,
    required String phoneNumber,
    required String identityNumber,
    required int age,
    required String gender,
    required String purpose,
  }) async {
    final token = await storage.read(key: 'token');

    if (token == null || token.isEmpty) {
      throw Exception('Please login again');
    }

    final response = await http.put(
      Uri.parse('$baseUrl/permanent_visitor/updateinfo'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'name': name,
        'email': email,
        'address': address,
        'phoneNumber': phoneNumber,
        'identityNumber': identityNumber,
        'age': age,
        'gender': gender,
        'purpose': purpose,
      }),
    );

    final data = jsonDecode(response.body);

    if (response.statusCode != 200) {
      throw Exception(
        data['message'] ?? data['error'] ?? 'Failed to update profile',
      );
    }

    final visitor = data['visitor'];

    if (visitor != null) {
      final updatedVisitor = Map<String, dynamic>.from(visitor);
      await saveProfile(updatedVisitor);
      //
      debugPrint('Update status: ${response.statusCode}');
      debugPrint('Update response: ${response.body}');
      //
      return updatedVisitor;
    }
    throw Exception('Updated profile data was not returned');
  }

  //DELETE ACCOUNT
  static Future<void> deleteAccount({required String password}) async {
    final token = await storage.read(key: 'token');

    if (token == null || token.isEmpty) {
      throw Exception('Please login again');
    }

    final response = await http.delete(
      Uri.parse('$baseUrl/permanent_visitor/delete'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'password': password}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode != 200) {
      throw Exception(data['message'] ?? 'Failed to delete account');
    }

    await storage.delete(key: 'token');
    await storage.delete(key: 'visitorProfile');
    await storage.delete(key: 'visitorName');
  }



  //RESET PASSWORD

  
static Future<void> resetPassword({
  required String oldPassword,
  required String newPassword,
}) async {
  final token = await storage.read(key: 'token');

  if (token == null || token.isEmpty) {
    throw Exception('Please login again');
  }

  final response = await http.put(
    Uri.parse('$baseUrl/permanent_visitor/updateinfo'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    },
    body: jsonEncode({
      'oldPassword': oldPassword,
      'newPassword': newPassword,
    }),
  );

  final data = jsonDecode(response.body);

  if (response.statusCode != 200) {
    throw Exception(
      data['message'] ?? 'Failed to reset password',
    );
  }
}

}
