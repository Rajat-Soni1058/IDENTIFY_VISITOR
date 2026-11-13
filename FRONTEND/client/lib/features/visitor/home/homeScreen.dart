import 'package:client/features/visitor/profile/profileScreen.dart';
import 'package:client/providers/visit_provider.dart';
import 'package:client/services/QRservice.dart';
import 'package:client/services/vistitor_auth_service.dart';
import 'package:client/features/visitor/visitor_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'dart:math';

class VisitorHomescreen extends ConsumerStatefulWidget {
  final String token;
  const VisitorHomescreen({required this.token});

  @override
  ConsumerState<VisitorHomescreen> createState() => _HomescreenState();
}

class _HomescreenState extends ConsumerState<VisitorHomescreen> {
  late int nonce;
  String visitorName = 'Visitor';

  @override
  void initState() {
    super.initState();
    nonce = Random.secure().nextInt(1 << 32);
    _loadVisitorName();
  }

  void refreshQr() {
    setState(() {
      nonce = Random.secure().nextInt(1 << 32);
    });
  }

  Future<void> _loadVisitorName() async {
    final name = await AuthService.storage.read(key: 'visitorName');

    if (!mounted) return;

    setState(() {
      visitorName = (name != null && name.trim().isNotEmpty) ? name : 'Visitor';
    });
  }

  @override
  Widget build(BuildContext context) {
    final entry = ref.watch(visitProvider);
    String qrData = '';
    String? error;
    try {
      qrData = Qrservice.generateQrData(
        widget.token,
        entry,
        nonce,
        DateTime.now(),
      );
    } catch (e) {
      error = 'Something went wrong. Unable to generate QR code.';
    }
    return Theme(
      data: VisitorUi.theme(),
      child: Scaffold(
        appBar: AppBar(
          //profile button
          leading: Center(
            child: IconButton(
              onPressed: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => VisitorProfileScreen(),
                  ),
                );
                await _loadVisitorName();
              },
              icon: const Icon(Icons.person_outline),
            ),
          ),
          title: const Text(
            'IDENTIFY_VISITOR',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
          actions: [
            IconButton(
              onPressed: () {},
              icon: const Icon(Icons.notifications_none_rounded),
            ),
          ],
        ),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
              child: Column(
                children: [
                  VisitorUi.roundedCard(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                    child: Column(
                      children: [
                        Text(
                          'Hello $visitorName, 👋',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: VisitorUi.text,
                          ),
                        ),

                        const SizedBox(height: 8),

                        const Text(
                          'Show this QR code to the guard',
                          style: TextStyle(color: VisitorUi.muted),
                        ),

                        const SizedBox(height: 24),

                        // QR code
                        if (error != null)
                          Text(error, style: const TextStyle(color: Colors.red))
                        else
                          QrImageView(
                            data: qrData,
                            size: 220,
                            backgroundColor: Colors.white,
                          ),

                        const SizedBox(height: 20),

                        Text(
                          entry == 1 ? 'ENTRY QR' : 'EXIT QR',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: entry == 1
                                ? Colors.green.shade700
                                : Colors.red,
                          ),
                        ),

                        const SizedBox(height: 30),

                        // Entry and Exit buttons
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () {
                                  ref.read(visitProvider.notifier).state = 1;
                                  refreshQr();
                                },
                                style: ElevatedButton.styleFrom(
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadiusGeometry.circular(
                                      12,
                                    ),
                                  ),
                                  backgroundColor: VisitorUi.green,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 20,
                                  ),
                                ),
                                child: Column(
                                  // mainAxisAlignment: MainAxisAlignment.center,
                                  // crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.login,
                                      size: 24.sp,
                                      color: Colors.white,
                                    ),
                                    SizedBox(height: 10.h),
                                    Text(
                                      'ENTRY',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 17.sp,
                                      ),
                                    ),
                                    SizedBox(height: 2.h),
                                    Text(
                                      'make your entry',
                                      style: TextStyle(
                                        fontWeight: FontWeight.normal,
                                        fontSize: 12.sp,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            const SizedBox(width: 16),

                            Expanded(
                              child: ElevatedButton(
                                onPressed: () {
                                  ref.read(visitProvider.notifier).state = 0;
                                  refreshQr();
                                },
                                style: ElevatedButton.styleFrom(
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadiusGeometry.circular(
                                      12,
                                    ),
                                  ),
                                  backgroundColor: const Color(0xFFE95252),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 20,
                                  ),
                                ),
                                child: Column(
                                  // mainAxisAlignment: MainAxisAlignment.center,
                                  // crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.logout,
                                      size: 24.sp,
                                      color: Colors.white,
                                    ),
                                    SizedBox(height: 10.h),
                                    Text(
                                      'EXIT',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 17.sp,
                                      ),
                                    ),
                                    SizedBox(height: 2.h),
                                    Text(
                                      'make your exit',
                                      style: TextStyle(
                                        fontWeight: FontWeight.normal,
                                        fontSize: 12.sp,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 30.h),
                  GestureDetector(
                    onTap: () async {},
                    child: VisitorUi.roundedCard(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      child: ListTile(
                        leading: const Icon(
                          Icons.history_rounded,
                          color: VisitorUi.green,
                        ),
                        title: const Text(
                          "View Visit History",
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                        trailing: const Icon(Icons.arrow_forward_ios, size: 18),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
