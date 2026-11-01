import 'package:client/features/visitor/profile/profileScreen.dart';
import 'package:client/providers/visit_provider.dart';
import 'package:client/services/QRservice.dart';
import 'package:client/services/vistitor_auth_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'dart:math';

class Homescreen extends ConsumerStatefulWidget {
  final String token;
  const Homescreen({required this.token});

  @override
  ConsumerState<Homescreen> createState() => _HomescreenState();
}

class _HomescreenState extends ConsumerState<Homescreen> {
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
  final name = await AuthService.storage.read(
    key: 'visitorName',
  );

  if (!mounted) return;

  setState(() {
    visitorName = (name != null && name.trim().isNotEmpty)
        ? name
        : 'Visitor';
  });
}


  @override
  Widget build(BuildContext context) {
    final entry = ref.watch(visitProvider);
    String qrData = '';
    String? error;
    try {
      qrData = Qrservice.generateQrData(widget.token, entry, nonce);
    } catch (e) {
      error = 'Something went wrong. Unable to generate QR code.';
    }
    return Scaffold(
      backgroundColor: const Color(0xFFF1F8F5),
      appBar: AppBar(
        //profile button
        leading: Center(
          child: IconButton(
            onPressed: () async{
             await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) =>
                      ProfileScreen(),
                ),
              );
              await _loadVisitorName();
            },
            icon: Icon(Icons.person),
          ),
        ),
        title: const Text(
          'IDENTIFY_VISITOR',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFFF1F8F5),
        actions: [
          IconButton(
            onPressed: () {},
            icon: Icon(Icons.notifications_active_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Card(
                  surfaceTintColor: Colors.white,
                  color: Colors.white,
                  shadowColor: Colors.greenAccent,
                  elevation: 2,
                  child: Padding(
                    padding: const EdgeInsets.all(30.0),
                    child: Column(
                      children: [
                        Text(
                          'Hello $visitorName, 👋',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),

                        const SizedBox(height: 8),

                        const Text('Show this QR code to the guard'),

                        const SizedBox(height: 24),

                        // QR code
                        if (error != null)
                          Text(error, style: const TextStyle(color: Colors.red))
                        else
                          QrImageView(
                            data: qrData,
                            size: 230,
                            backgroundColor: Colors.white,
                          ),

                        const SizedBox(height: 20),

                        Text(
                          entry == 1 ? 'ENTRY QR' : 'EXIT QR',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
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
                                  backgroundColor: Colors.green.shade700,
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
                                  backgroundColor: Colors.red,
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
                ),
                SizedBox(height: 30.h),
                GestureDetector(
                  onTap: () async {},
                  child: Card(
                    surfaceTintColor: Colors.white,
                    color: Colors.white,
                    shadowColor: Colors.greenAccent,
                    elevation: 2,
                    child: Padding(
                      padding: const EdgeInsets.all(5.0),
                      child: ListTile(
                        leading: Icon(Icons.alarm),
                        title: Text(
                          "View Visit History",
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        trailing: Icon(Icons.arrow_forward_ios),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
