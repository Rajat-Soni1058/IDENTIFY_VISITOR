import 'package:client/auth/common/common_authGate.dart';
import 'package:client/features/visitor/profile/deleteAccount.dart';
import 'package:client/features/visitor/profile/updateProfileScreen.dart';
import 'package:client/services/vistitor_auth_service.dart';
import 'package:client/features/visitor/visitor_ui.dart';
import 'package:flutter/material.dart';

class VisitorProfileScreen extends StatefulWidget {
  const VisitorProfileScreen({super.key});

  @override
  State<VisitorProfileScreen> createState() => _VisitorProfileScreenState();
}

class _VisitorProfileScreenState extends State<VisitorProfileScreen> {
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Profile data not found')));
      return;
    }

    final updatedProfile = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (_) => VisitorUpdateProfileScreen(profile: profile),
      ),
    );

    if (!mounted || updatedProfile == null) return;

    _setUpdatedProfile(updatedProfile);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Profile updated successfully')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: VisitorUi.theme(),
      child: Scaffold(
        appBar: AppBar(
          title: const Text(
            'My Profile',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
          actions: [
            IconButton(
              tooltip: 'Update Profile',
              icon: const Icon(Icons.edit),
              onPressed: _openUpdateProfile,
            ),
          ],
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            child: Column(
              children: [
                FutureBuilder<Map<String, dynamic>?>(
                  future: _profileFuture,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }

                    final profile = snapshot.data;

                    if (profile == null) {
                      return const Center(
                        child: Text('Profile data not found'),
                      );
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
                      padding: const EdgeInsets.fromLTRB(18, 8, 18, 18),
                      child: Column(
                        children: [
                          Container(
                            width: 92,
                            height: 92,
                            decoration: BoxDecoration(
                              color: VisitorUi.green.withValues(alpha: .12),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.person_rounded,
                              size: 52,
                              color: VisitorUi.green,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            fields['Name']?.toString() ?? 'Visitor',
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 20),
                          VisitorUi.roundedCard(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Column(
                              children: fields.entries.map((item) {
                                return ListTile(
                                  dense: true,
                                  leading: const Icon(
                                    Icons.check_circle_outline,
                                    color: VisitorUi.green,
                                    size: 20,
                                  ),
                                  title: Text(
                                    item.key,
                                    style: const TextStyle(
                                      color: VisitorUi.muted,
                                      fontSize: 12,
                                    ),
                                  ),
                                  subtitle: Text(
                                    item.value?.toString() ?? 'Not available',
                                    style: const TextStyle(
                                      color: VisitorUi.text,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      await AuthService.clearAll();
                      if (!context.mounted) return;
                      Navigator.pushAndRemoveUntil(
                        context,
                        MaterialPageRoute(builder: (_) => CommonAuthGate()),
                        (route) => false,
                      );
                    },
                    icon: const Icon(Icons.logout),
                    label: const Text("Logout"),
                    style: VisitorUi.primaryButton(),
                  ),
                ),
                const SizedBox(height: 40),

                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  child: OutlinedButton.icon(
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
                      minimumSize: const Size.fromHeight(52),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 100),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
