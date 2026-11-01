
import 'package:client/features/guard/home/guardHome.dart';
import 'package:flutter/material.dart';
import 'package:client/services/guard_auth_service.dart';

class GuardSignupScreen extends StatefulWidget {
  const GuardSignupScreen({super.key});

  @override
  State<GuardSignupScreen> createState() => _GuardSignupScreenState();
}

class _GuardSignupScreenState extends State<GuardSignupScreen> {
  final PageController _pageController = PageController();

  final List<GlobalKey<FormState>> _formKeys = [
    GlobalKey<FormState>(),
    GlobalKey<FormState>(),
    GlobalKey<FormState>(),
  ];

  int currentStep = 0;
  bool isLoading = false;
  bool obscurePassword = true;
  bool obscureConfirmPassword = true;

  // Step 1 controllers
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();

  // Step 2 controllers
  final nameController = TextEditingController();
  final ageController = TextEditingController();
  final addressController = TextEditingController();
  String? selectedGender;

  // Step 3 controllers
  final phoneController = TextEditingController();
  final employeeIdController = TextEditingController();
  final organizationCodeController = TextEditingController();

  @override
  void dispose() {
    _pageController.dispose();

    emailController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();

    nameController.dispose();
    ageController.dispose();
    addressController.dispose();

    phoneController.dispose();
    employeeIdController.dispose();
    organizationCodeController.dispose();

    super.dispose();
  }

  // Move to next step
  void nextStep() {
    if (!_formKeys[currentStep].currentState!.validate()) {
      return;
    }

    if (currentStep < 2) {
      setState(() {
        currentStep++;
      });

      _pageController.animateToPage(
        currentStep,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  // Move to previous step
  void previousStep() {
    if (currentStep > 0) {
      setState(() {
        currentStep--;
      });

      _pageController.animateToPage(
        currentStep,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  // Submit signup
  Future<void> submitSignup() async {
    if (!_formKeys[2].currentState!.validate()) {
      return;
    }

    setState(() {
      isLoading = true;
    });

    try {
      final result = await GuardAuthService.signup(
        name: nameController.text.trim(),
        email: emailController.text.trim(),
        password: passwordController.text,
        phoneNumber: phoneController.text.trim(),
        address: addressController.text.trim(),
        age: ageController.text.trim().isEmpty
            ? null
            : int.parse(ageController.text.trim()),
        gender: selectedGender,
        employeeId: employeeIdController.text.trim(),
        organizationCode: organizationCodeController.text.trim().isEmpty ? null :organizationCodeController.text.trim(),
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result['message'] ?? 'Signup successful',
          ),
          backgroundColor: Colors.green,
        ),
      );

Navigator.pushAndRemoveUntil(
  context,
  MaterialPageRoute(
    builder: (context) => const Guardhome(),
  ),
  (route) => false,
);
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceFirst('Exception: ', ''),
          ),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }

  Widget buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool isPassword = false,
    bool isEmail = false,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
    Widget? suffixIcon,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: isPassword,
      keyboardType: keyboardType,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        suffixIcon: suffixIcon,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      validator: validator ??
          (value) {
            if (value == null || value.trim().isEmpty) {
              return '$label is required';
            }
            return null;
          },
    );
  }

  Widget buildStepOne() {
    return Form(
      key: _formKeys[0],
      child: Column(
        children: [
          buildTextField(
            controller: emailController,
            label: 'Email',
            icon: Icons.email_outlined,
            isEmail: true,
            keyboardType: TextInputType.emailAddress,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Email is required';
              }

              if (!RegExp(
                r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
              ).hasMatch(value.trim())) {
                return 'Enter a valid email address';
              }

              return null;
            },
          ),

          const SizedBox(height: 20),

          buildTextField(
            controller: passwordController,
            label: 'Password',
            icon: Icons.lock_outline,
            isPassword: obscurePassword,
            suffixIcon: IconButton(
              icon: Icon(
                obscurePassword
                    ? Icons.visibility_off
                    : Icons.visibility,
              ),
              onPressed: () {
                setState(() {
                  obscurePassword = !obscurePassword;
                });
              },
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Password is required';
              }

              if (value.length < 6) {
                return 'Password must be at least 6 characters';
              }

              return null;
            },
          ),

          const SizedBox(height: 20),

          buildTextField(
            controller: confirmPasswordController,
            label: 'Confirm Password',
            icon: Icons.lock_outline,
            isPassword: obscureConfirmPassword,
            suffixIcon: IconButton(
              icon: Icon(
                obscureConfirmPassword
                    ? Icons.visibility_off
                    : Icons.visibility,
              ),
              onPressed: () {
                setState(() {
                  obscureConfirmPassword =
                      !obscureConfirmPassword;
                });
              },
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please confirm your password';
              }

              if (value != passwordController.text) {
                return 'Passwords do not match';
              }

              return null;
            },
          ),
        ],
      ),
    );
  }

  Widget buildStepTwo() {
    return Form(
      key: _formKeys[1],
      child: Column(
        children: [
          buildTextField(
            controller: nameController,
            label: 'Full Name',
            icon: Icons.person_outline,
          ),

          const SizedBox(height: 20),

          buildTextField(
            controller: ageController,
            label: 'Age (Optional)',
            icon: Icons.calendar_today_outlined,
            keyboardType: TextInputType.number,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return null;
              }

              final age = int.tryParse(value.trim());

              if (age == null || age <= 0 || age > 120) {
                return 'Enter a valid age';
              }

              return null;
            },
          ),

          const SizedBox(height: 20),

          DropdownButtonFormField<String>(
            value: selectedGender,
            decoration: InputDecoration(
              labelText: 'Gender (Optional)',
              prefixIcon: const Icon(Icons.people_outline),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            items: const [
              DropdownMenuItem(
                value: 'male',
                child: Text('Male'),
              ),
              DropdownMenuItem(
                value: 'female',
                child: Text('Female'),
              ),
              DropdownMenuItem(
                value: 'other',
                child: Text('Other'),
              ),
            ],
            onChanged: (value) {
              setState(() {
                selectedGender = value;
              });
            },
          ),

          const SizedBox(height: 20),

          buildTextField(
            controller: addressController,
            label: 'Address',
            icon: Icons.location_on_outlined,
            maxLines: 2,
          ),
        ],
      ),
    );
  }

  Widget buildStepThree() {
    return Form(
      key: _formKeys[2],
      child: Column(
        children: [
          buildTextField(
            controller: phoneController,
            label: 'Phone Number',
            icon: Icons.phone_outlined,
            keyboardType: TextInputType.phone,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Phone number is required';
              }

              if (!RegExp(r'^[0-9]{10,15}$')
                  .hasMatch(value.trim())) {
                return 'Enter a valid phone number';
              }

              return null;
            },
          ),

          const SizedBox(height: 20),

          buildTextField(
            controller: employeeIdController,
            label: 'Employee ID (Optional)',
            icon: Icons.badge_outlined,
            validator: (_) => null,
          ),

          const SizedBox(height: 20),

          buildTextField(
            controller: organizationCodeController,
            label: 'Organization Code (Optional)',
            icon: Icons.business_outlined,
            validator: (_) => null,
          ),

          const SizedBox(height: 12),

          const Text(
            'If you have an organization code, enter it to request '
            'membership in your organization. Approval may be required.',
            style: TextStyle(
              color: Colors.grey,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F8F5),
      appBar: AppBar(
        title: const Text(
          'Guard Registration',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFFF1F8F5),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              // Step indicator
              Row(
                children: List.generate(3, (index) {
                  final active = index <= currentStep;

                  return Expanded(
                    child: Container(
                      margin: const EdgeInsets.symmetric(
                        horizontal: 4,
                      ),
                      height: 5,
                      decoration: BoxDecoration(
                        color: active
                            ? Colors.green.shade700
                            : Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  );
                }),
              ),

              const SizedBox(height: 25),

              Text(
                'Step ${currentStep + 1} of 3',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 8),

              Text(
                [
                  'Create your login credentials',
                  'Enter your personal details',
                  'Enter your work details',
                ][currentStep],
                style: const TextStyle(color: Colors.grey),
              ),

              const SizedBox(height: 25),

              Expanded(
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    SingleChildScrollView(
                      child: buildStepOne(),
                    ),
                    SingleChildScrollView(
                      child: buildStepTwo(),
                    ),
                    SingleChildScrollView(
                      child: buildStepThree(),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              Row(
                children: [
                  if (currentStep > 0)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: isLoading ? null : previousStep,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            vertical: 16,
                          ),
                        ),
                        child: const Text('BACK'),
                      ),
                    ),

                  if (currentStep > 0)
                    const SizedBox(width: 12),

                  Expanded(
                    child: ElevatedButton(
                      onPressed: isLoading
                          ? null
                          : currentStep == 2
                              ? submitSignup
                              : nextStep,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          vertical: 16,
                        ),
                      ),
                      child: isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : Text(
                              currentStep == 2
                                  ? 'SIGN UP'
                                  : 'NEXT',
                            ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
