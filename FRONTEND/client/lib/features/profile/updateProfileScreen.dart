import 'package:client/services/auth_service.dart';
import 'package:flutter/material.dart';

class UpdateProfileScreen extends StatefulWidget {
  final Map<String, dynamic> profile;

  const UpdateProfileScreen({super.key, required this.profile});

  @override
  State<UpdateProfileScreen> createState() => _UpdateProfileScreenState();
}

class _UpdateProfileScreenState extends State<UpdateProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  late final TextEditingController _addressController;
  late final TextEditingController _phoneController;
  late final TextEditingController _identityController;
  late final TextEditingController _ageController;
  late final TextEditingController _purposeController;

  bool _isLoading = false;
  String? _gender;

  String _value(dynamic value) => value?.toString() ?? '';

  @override
  void initState() {
    super.initState();

    final profile = widget.profile;

    _nameController = TextEditingController(text: _value(profile['name']));
    _emailController = TextEditingController(text: _value(profile['email']));
    _addressController = TextEditingController(
      text: _value(profile['address']),
    );
    _phoneController = TextEditingController(
      text: _value(profile['phoneNumber']),
    );
    _identityController = TextEditingController(
      text: _value(profile['identityNumber']),
    );
    _ageController = TextEditingController(text: _value(profile['age']));
    _purposeController = TextEditingController(
      text: _value(profile['purpose']),
    );

    final savedGender = _value(profile['gender']).toLowerCase();

    _gender = ['male', 'female', 'other'].contains(savedGender)
        ? savedGender
        : null;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    _identityController.dispose();
    _ageController.dispose();
    _purposeController.dispose();
    super.dispose();
  }

  String? _requiredValidator(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'This field is required';
    }
    return null;
  }


Future<void> _submitForm() async {
  if (!_formKey.currentState!.validate()) return;

  final original = widget.profile;

  final hasChanges =
      _nameController.text.trim() != _value(original['name']) ||
      _emailController.text.trim() != _value(original['email']) ||
      _addressController.text.trim() != _value(original['address']) ||
      _phoneController.text.trim() != _value(original['phoneNumber']) ||
      _identityController.text.trim() !=
          _value(original['identityNumber']) ||
      int.parse(_ageController.text.trim()) !=
          int.tryParse(_value(original['age'])) ||
      _gender != _value(original['gender']).toLowerCase() ||
      _purposeController.text.trim() != _value(original['purpose']);

  if (!hasChanges) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('No changes to update')),
    );
    return;
  }

  setState(() => _isLoading = true);

  try {
    final updatedProfile = await AuthService.updateInfo(
      name: _nameController.text.trim(),
      email: _emailController.text.trim(),
      address: _addressController.text.trim(),
      phoneNumber: _phoneController.text.trim(),
      identityNumber: _identityController.text.trim(),
      age: int.parse(_ageController.text.trim()),
      gender: _gender!,
      purpose: _purposeController.text.trim(),
    );

    if (!mounted) return;

    Navigator.pop(context, updatedProfile);
  } catch (e) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(e.toString())),
    );
  } finally {
    if (mounted) {
      setState(() => _isLoading = false);
    }
  }
}



Future<void> _showResetPasswordDialog() async {
  await showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const ResetPasswordDialog(),
  );
}


  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
    bool readOnly = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        readOnly: readOnly,
        validator: validator,
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 16,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Update Profile')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const Text(
                'Edit your information',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Update your details below.',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 24),

              _buildTextField(
                label: 'Full Name',
                controller: _nameController,
                validator: _requiredValidator,
              ),

              _buildTextField(
                label: 'Email',
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Email is required';
                  }
                  if (!RegExp(
                    r'^[^@\s]+@[^@\s]+\.[^@\s]+$',
                  ).hasMatch(value.trim())) {
                    return 'Enter a valid email';
                  }
                  return null;
                },
              ),

              _buildTextField(
                label: 'Address',
                controller: _addressController,
                validator: _requiredValidator,
              ),

              _buildTextField(
                label: 'Phone Number',
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                validator: _requiredValidator,
              ),

              _buildTextField(
                label: 'Identity Number',
                controller: _identityController,
                validator: _requiredValidator,
              ),

              _buildTextField(
                label: 'Age',
                controller: _ageController,
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Age is required';
                  }

                  final age = int.tryParse(value.trim());

                  if (age == null || age < 1 || age > 120) {
                    return 'Enter a valid age';
                  }

                  return null;
                },
              ),

              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: DropdownButtonFormField<String>(
                  value: _gender,
                  decoration: const InputDecoration(
                    labelText: 'Gender',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'male', child: Text('Male')),
                    DropdownMenuItem(value: 'female', child: Text('Female')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please select your gender';
                    }
                    return null;
                  },
                  onChanged: (value) {
                    setState(() {
                      _gender = value;
                    });
                  },
                ),
              ),

              _buildTextField(
                label: 'Purpose of Visit',
                controller: _purposeController,
                validator: _requiredValidator,
              ),

              const SizedBox(height: 12),

              
const SizedBox(height: 12),

OutlinedButton.icon(
  onPressed: _isLoading ? null : _showResetPasswordDialog,
  icon: const Icon(Icons.lock_reset),
  label: const Text('Reset Password'),
  style: OutlinedButton.styleFrom(
    foregroundColor: Colors.blue,
    padding: const EdgeInsets.symmetric(vertical: 16),
  ),
),

const SizedBox(height: 12,),

              ElevatedButton.icon(
                onPressed: _isLoading ? null : _submitForm,
                icon: _isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save),
                label: Text(_isLoading ? 'Updating...' : 'Update Profile'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


class ResetPasswordDialog extends StatefulWidget {
  const ResetPasswordDialog({super.key});

  @override
  State<ResetPasswordDialog> createState() =>
      _ResetPasswordDialogState();
}

class _ResetPasswordDialogState extends State<ResetPasswordDialog> {
  final _oldPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscureOld = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isResetting = false;

  @override
  void dispose() {
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _resetPassword() async {
    final oldPassword = _oldPasswordController.text;
    final newPassword = _newPasswordController.text;
    final confirmPassword = _confirmPasswordController.text;

    String? error;

    if (oldPassword.isEmpty ||
        newPassword.isEmpty ||
        confirmPassword.isEmpty) {
      error = 'Please fill all fields';
    } else if (newPassword.length < 6) {
      error = 'New password must be at least 6 characters';
    } else if (oldPassword == newPassword) {
      error = 'New password must differ from old password';
    } else if (newPassword != confirmPassword) {
      error = 'New passwords do not match';
    }

    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error)),
      );
      return;
    }

    setState(() => _isResetting = true);

    try {
      await AuthService.resetPassword(
        oldPassword: oldPassword,
        newPassword: newPassword,
      );

      if (!mounted) return;

      Navigator.of(context).pop();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password reset successfully'),
        ),
      );
    } catch (e) {
      if (!mounted) return;

      setState(() => _isResetting = false);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }

  Widget _passwordField({
    required String label,
    required TextEditingController controller,
    required bool obscure,
    required VoidCallback toggleVisibility,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      decoration: InputDecoration(
        labelText: label,
        suffixIcon: IconButton(
          icon: Icon(
            obscure ? Icons.visibility_off : Icons.visibility,
          ),
          onPressed: toggleVisibility,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Reset Password'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _passwordField(
              label: 'Old Password',
              controller: _oldPasswordController,
              obscure: _obscureOld,
              toggleVisibility: () {
                setState(() => _obscureOld = !_obscureOld);
              },
            ),
            const SizedBox(height: 12),
            _passwordField(
              label: 'New Password',
              controller: _newPasswordController,
              obscure: _obscureNew,
              toggleVisibility: () {
                setState(() => _obscureNew = !_obscureNew);
              },
            ),
            const SizedBox(height: 12),
            _passwordField(
              label: 'Confirm New Password',
              controller: _confirmPasswordController,
              obscure: _obscureConfirm,
              toggleVisibility: () {
                setState(
                  () => _obscureConfirm = !_obscureConfirm,
                );
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isResetting
              ? null
              : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isResetting ? null : _resetPassword,
          child: _isResetting
              ? const SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Reset'),
        ),
      ],
    );
  }
}
