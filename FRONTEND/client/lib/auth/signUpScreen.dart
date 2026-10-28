import 'package:client/auth/loginScreen.dart';
import 'package:client/features/home/homeScreen.dart';
import 'package:client/services/auth_service.dart';
import 'package:flutter/material.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _formKey = GlobalKey<FormState>();

  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();
  final nameController = TextEditingController();
  final ageController = TextEditingController();
  final identityController = TextEditingController();
  final phoneController = TextEditingController();
  final purposeController = TextEditingController();
  final addressController = TextEditingController();

  int currentStep = 0;
  String? gender;
  bool isLoading = false;
  bool obscurePassword = true;
  bool obscureConfirmPassword = true;

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    nameController.dispose();
    ageController.dispose();
    identityController.dispose();
    phoneController.dispose();
    purposeController.dispose();
    addressController.dispose();
    super.dispose();
  }

  void nextStep() {
    if (!_formKey.currentState!.validate()) return;

    if (currentStep == 1 && gender == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select your gender')),
      );
      return;
    }

    if (currentStep < 2) {
      setState(() => currentStep++);
    } else {
      signup();
    }
  }

  Future<void> signup() async {
    if (!_formKey.currentState!.validate()) return;

    if (gender == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select your gender')),
      );
      return;
    }

    setState(() => isLoading = true);

    try {
      final result = await AuthService.signup(
        name: nameController.text.trim(),
        email: emailController.text.trim(),
        password: passwordController.text,
        identityNumber: identityController.text.trim(),
        age: int.parse(ageController.text.trim()),
        gender: gender!,
        address: addressController.text.trim(),
        phoneNumber: phoneController.text.trim(),
        purpose: purposeController.text.trim(),
      );

      if (!mounted) return;

      final visitor = result['visitor'];

      if (result['token'] == null || visitor == null) {
        throw Exception('Signup response is missing visitor or token');
      }

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(
          builder: (_) => Homescreen(
            token: result['token'].toString(),
 ),
        ),
        (route) => false,
      );
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  Widget buildField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    bool obscureText = false,
    String? Function(String?)? validator,
    Widget? suffixIcon,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      maxLines: obscureText ? 1 : maxLines,
      validator:
          validator ??
          (value) => value == null || value.trim().isEmpty
              ? 'Please enter $label'
              : null,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        suffixIcon: suffixIcon,
        border: const OutlineInputBorder(),
      ),
    );
  }

  Widget buildStepFields() {
    switch (currentStep) {
      case 0:
        return Column(
          key: const ValueKey(0),
          children: [
            buildField(
              controller: emailController,
              label: 'Email',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              validator: (value) {
                if (value == null ||
                    !RegExp(
                      r'^[^@\s]+@[^@\s]+\.[^@\s]+$',
                    ).hasMatch(value.trim())) {
                  return 'Enter a valid email address';
                }
                return null;
              },
            ),
            const SizedBox(height: 18),
            buildField(
              controller: passwordController,
              label: 'Password',
              icon: Icons.lock_outline,
              obscureText: obscurePassword,
              suffixIcon: IconButton(
                icon: Icon(
                  obscurePassword ? Icons.visibility_off : Icons.visibility,
                ),
                onPressed: () =>
                    setState(() => obscurePassword = !obscurePassword),
              ),
              validator: (value) {
                if (value == null || value.length < 6) {
                  return 'Password must be at least 6 characters';
                }
                return null;
              },
            ),
            const SizedBox(height: 18),
            buildField(
              controller: confirmPasswordController,
              label: 'Confirm Password',
              icon: Icons.lock_reset,
              obscureText: obscureConfirmPassword,
              suffixIcon: IconButton(
                icon: Icon(
                  obscureConfirmPassword
                      ? Icons.visibility_off
                      : Icons.visibility,
                ),
                onPressed: () => setState(
                  () => obscureConfirmPassword = !obscureConfirmPassword,
                ),
              ),
              validator: (value) {
                if (value != passwordController.text) {
                  return 'Passwords do not match';
                }
                return null;
              },
            ),
          ],
        );

      case 1:
        return Column(
          key: const ValueKey(1),
          children: [
            buildField(
              controller: nameController,
              label: 'Full Name',
              icon: Icons.person_outline,
            ),
            const SizedBox(height: 18),
            buildField(
              controller: ageController,
              label: 'Age',
              icon: Icons.cake_outlined,
              keyboardType: TextInputType.number,
              validator: (value) {
                final age = int.tryParse(value ?? '');
                if (age == null || age < 1 || age > 120) {
                  return 'Enter a valid age';
                }
                return null;
              },
            ),
            const SizedBox(height: 18),
            DropdownButtonFormField<String>(
              value: gender,
              decoration: const InputDecoration(
                labelText: 'Gender',
                prefixIcon: Icon(Icons.person_outline),
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'male', child: Text('Male')),
                DropdownMenuItem(value: 'female', child: Text('Female')),
                DropdownMenuItem(value: 'other', child: Text('Other')),
              ],
              onChanged: (value) => setState(() => gender = value),
            ),
            const SizedBox(height: 18),
            buildField(
              controller: addressController,
              label: 'Address',
              icon: Icons.location_on_outlined,
              maxLines: 2,
            ),
            const SizedBox(height: 18),
          ],
        );

      default:
        return Column(
          key: const ValueKey(2),
          children: [
            buildField(
              controller: identityController,
              label: 'Identity Number',
              icon: Icons.badge_outlined,
            ),
            const SizedBox(height: 18),
            buildField(
              controller: phoneController,
              label: 'Phone Number',
              icon: Icons.phone_outlined,
              keyboardType: TextInputType.phone,
              validator: (value) {
                if (value == null ||
                    !RegExp(r'^\d{10}$').hasMatch(value.trim())) {
                  return 'Enter a valid 10-digit phone number';
                }
                return null;
              },
            ),
            const SizedBox(height: 18),
            buildField(
              controller: purposeController,
              label: 'Purpose of Visit',
              icon: Icons.info_outline,
              maxLines: 3,
            ),
          ],
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    const titles = ['Account Details', 'Personal Details', 'Visitor Details'];

    return Scaffold(
      backgroundColor: const Color(0xFFF1F8F5),
      appBar: AppBar(
        title: const Text('Create Account'),
        backgroundColor: const Color(0xFFF1F8F5),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Text(
                'Join Identify Visitor',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text('Step ${currentStep + 1} of 3'),
              const SizedBox(height: 12),
              LinearProgressIndicator(
                value: (currentStep + 1) / 3,
                minHeight: 6,
                borderRadius: BorderRadius.circular(10),
                color: const Color(0xFF078653),
                backgroundColor: Colors.black12,
              ),
              const SizedBox(height: 28),
              Text(
                titles[currentStep],
                style: const TextStyle(
                  fontSize: 21,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 20),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: buildStepFields(),
              ),
              const SizedBox(height: 28),
              Row(
                children: [
                  if (currentStep > 0)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: isLoading
                            ? null
                            : () => setState(() => currentStep--),
                        child: const Text('Back'),
                      ),
                    ),
                  if (currentStep > 0) const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: isLoading ? null : nextStep,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF078653),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.all(16),
                      ),
                      child: isLoading
                          ? const SizedBox(
                              height: 22,
                              width: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(currentStep == 2 ? 'Sign Up' : 'Continue'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (currentStep == 0)
                TextButton(
                  onPressed: isLoading
                      ? null
                      : () {
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const LoginScreen(),
                            ),
                          );
                        },
                  child: const Text('Already have an account? Login'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
