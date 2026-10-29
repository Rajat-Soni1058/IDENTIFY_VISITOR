import 'package:client/auth/authGate.dart';
import 'package:client/features/profile/deleteAccount.dart';
import 'package:client/features/profile/updateProfileScreen.dart';
import 'package:client/services/auth_service.dart';
import 'package:flutter/material.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {

late Future<Map<String, dynamic>?> _profileFuture;

@override
void initState() {
  super.initState();
  _refreshProfile();
}

void _refreshProfile() {
  _profileFuture = AuthService.getProile();
}
void _setUpdatedProfile(Map<String, dynamic> profile) {
  setState(() {
    _profileFuture = Future.value(profile);
  });
}


Future<void> _openUpdateProfile() async {
  final profile = await _profileFuture;

  if (!mounted) return;

  if (profile == null) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Profile data not found')),
    );
    return;
  }

  final updatedProfile =
      await Navigator.push<Map<String, dynamic>>(
    context,
    MaterialPageRoute(
      builder: (_) => UpdateProfileScreen(profile: profile),
    ),
  );

  if (!mounted || updatedProfile == null) return;

  _setUpdatedProfile(updatedProfile);

  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(
      content: Text('Profile updated successfully'),
    ),
  );
}


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          IconButton(
            tooltip: 'Update Profile',
            icon: const Icon(Icons.edit),
            onPressed:  _openUpdateProfile,
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              FutureBuilder<Map<String, dynamic>?>(
                future: _profileFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final profile = snapshot.data;

                  if (profile == null) {
                    return const Center(child: Text('Profile data not found'));
                  }

                  final fields = {
                    'Name': profile['name'],
                    'Email': profile['email'],
                    'Address': profile['address'],
                    'Phone Number': profile['phoneNumber'],
                    'Identity Number': profile['identityNumber'],
                    // 'Suspicious Count': profile['suspiciousCount'],
                    // 'Is Blocked': profile['isBlocked'],
                    'Age': profile['age'],
                    'Gender': profile['gender'],
                    'Purpose': profile['purpose'],
                  };

                  return Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: fields.entries.map((item) {
                        return ListTile(
                          title: Text(item.key),
                          subtitle: Text(
                            item.value?.toString() ?? 'Not available',
                          ),
                        );
                      }).toList(),
                    ),
                  );
                },
              ),
              ElevatedButton(
                onPressed: () async {
                  await AuthService.clearAll();
                  if (!context.mounted) return;
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (_) => AuthGate()),
                    (route) => false,
                  );
                },
                child: Text("LOGOUT"),
              ),
              const SizedBox(height: 40),

              OutlinedButton.icon(
                onPressed: () async {
                  final password = await showDialog<String>(
                    context: context,
                    builder: (_) => const DeleteAccountDialog(),
                  );

                  if (password == null || !context.mounted) return;

                  try {
                    await AuthService.deleteAccount(password: password);

                    if (!context.mounted) return;

                    Navigator.pushNamedAndRemoveUntil(
                      context,
                      '/',
                      (route) => false,
                    );
                  } catch (e) {
                    if (!context.mounted) return;

                    ScaffoldMessenger.of(
                      context,
                    ).showSnackBar(SnackBar(content: Text(e.toString())));
                  }
                },
                icon: const Icon(Icons.delete_forever),
                label: const Text('Delete Account'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  padding: const EdgeInsets.all(14),
                ),
              ),

              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }
}
