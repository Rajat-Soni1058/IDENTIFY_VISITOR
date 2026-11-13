
import 'package:client/auth/common/common_authGate.dart';
import 'package:client/services/common_auth_service.dart';
import 'package:client/services/vistitor_auth_service.dart';
import 'package:flutter/material.dart';

class GuardhomeScreen extends StatelessWidget {
  const GuardhomeScreen({super.key});

  static const Color primary = Color(0xFF5125D5);
  static const Color bg = Color(0xFFF6F5FD);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bg,

      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [

              // HEADER
              Row(
                children: [
                  const CircleAvatar(
                    radius: 29,
                    backgroundColor: Color(0xFFEAE4FF),
                    child: Icon(
                      Icons.security,
                      size: 34,
                      color: primary,
                    ),
                  ),
                  const SizedBox(width: 14),

                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Good morning,",
                          style: TextStyle(
                            fontSize: 17,
                            color: Colors.black54,
                          ),
                        ),
                        Text(
                          "Rajat",
                          style: TextStyle(
                            fontSize: 23,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          "Security Guard",
                          style: TextStyle(
                            fontSize: 15,
                            color: Colors.black54,
                          ),
                        ),
                      ],
                    ),
                  ),

                  Stack(
                    children: [
                      IconButton(
                        onPressed: () {},
                        icon: const Icon(
                          Icons.notifications_none,
                          size: 30,
                        ),
                      ),
                      Positioned(
                        right: 9,
                        top: 8,
                        child: Container(
                          height: 10,
                          width: 10,
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // ORGANIZATION CARD
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEDE7FF),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(
                        Icons.business,
                        size: 32,
                        color: primary,
                      ),
                    ),

                    const SizedBox(width: 14),

                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "IIIT Bhagalpur",
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: 3),
                          Text(
                            "ORG2026",
                            style: TextStyle(
                              fontSize: 15,
                              color: Colors.black54,
                            ),
                          ),
                        ],
                      ),
                    ),

                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE4F7E9),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        children: [
                          Icon(
                            Icons.check_circle,
                            color: Colors.green,
                            size: 17,
                          ),
                          SizedBox(width: 5),
                          Text(
                            "Approved",
                            style: TextStyle(
                              color: Colors.green,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 5),
                    const Icon(
                      Icons.arrow_forward_ios,
                      size: 17,
                      color: Colors.black54,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // SCAN VISITOR QR CARD
              GestureDetector(
                onTap: () {
                  // Navigate to QR scanner screen
                },
                child: Container(
                  height: 235,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEDE9FC),
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        height: 140,
                        width: 140,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: primary,
                          border: Border.all(
                            color: const Color(0xFFD5C9FF),
                            width: 9,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: primary.withValues(alpha: 0.15),
                              blurRadius: 15,
                              spreadRadius: 5,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.qr_code_scanner,
                          color: Colors.white,
                          size: 60,
                        ),
                      ),

                      const SizedBox(height: 8),

                      const Text(
                        "Scan Visitor QR",
                        style: TextStyle(
                          fontSize: 23,
                          fontWeight: FontWeight.bold,
                        ),
                      ),

                      const SizedBox(height: 3),

                      const Text(
                        "Mark entry / exit, view details",
                        style: TextStyle(
                          fontSize: 15,
                          color: Colors.black54,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // TODAY'S SUMMARY HEADER
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Today's Summary",
                    style: TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    "31 Oct 2026",
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.black54,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // SUMMARY CARDS
              Row(
                children: [
                  Expanded(
                    child: summaryCard(
                      Icons.people,
                      "24",
                      "Visitors",
                      const Color(0xFFE5F5EC),
                      Colors.green,
                    ),
                  ),
                  const SizedBox(width: 7),
                  Expanded(
                    child: summaryCard(
                      Icons.login,
                      "18",
                      "Entries",
                      const Color(0xFFE6F0FF),
                      Colors.blue,
                    ),
                  ),
                  const SizedBox(width: 7),
                  Expanded(
                    child: summaryCard(
                      Icons.logout,
                      "6",
                      "Exits",
                      const Color(0xFFFFEBEB),
                      Colors.red,
                    ),
                  ),
                  const SizedBox(width: 7),
                  // Expanded(
                  //   child: summaryCard(
                  //     Icons.access_time_filled,
                  //     "4",
                  //     "Inside",
                  //     const Color(0xFFFFF4DE),
                  //     Colors.orange,
                  //   ),
                  // ),
                ],
              ),

              const SizedBox(height: 15),

              // CURRENTLY INSIDE
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 15,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.circle,
                      color: Colors.green,
                      size: 15,
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        "Search History",
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                      ),
                    ),
                    const Text(
                      "4",
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(width: 15),
                    const Icon(Icons.arrow_forward_ios, size: 17),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // QUICK ACTIONS HEADER
              const Text(
                "Quick Actions",
                style: TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 12),

              // QUICK ACTIONS GRID
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 2.35,
                children: [
                  quickAction(
                    Icons.people,
                    "Today's\nVisitors",
                    primary,
                    const Color(0xFFEDE7FF),
                  ),
                  quickAction(
                    Icons.format_list_bulleted,
                    "Currently\nInside",
                    primary,
                    const Color(0xFFEDE7FF),
                  ),
                  quickAction(
                    Icons.calendar_month,
                    "Previous Day\nRecords",
                    Colors.blue,
                    const Color(0xFFE6F0FF),
                  ),
                  quickAction(
                    Icons.bar_chart,
                    "Reports",
                    Colors.orange,
                    const Color(0xFFFFF1DA),
                  ),
                ],
              ),
              ElevatedButton(onPressed: ()async{
                await CommonAuthService.logout();
                Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_)=>CommonAuthGate()), (Route)=>false);
              }, child: Text("Logout"))
            ],
          ),
        ),
      ),

      // BOTTOM NAVIGATION
      bottomNavigationBar: Container(
        height: 85,
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 10,
            ),
          ],
        ),
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.topCenter,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                bottomItem(
                  Icons.home_filled,
                  "Home",
                  true,
                ),

                const SizedBox(width: 70),

                bottomItem(
                  Icons.person_outline,
                  "Profile",
                  false,
                ),
              ],
            ),

            Positioned(
              top: -22,
              child: GestureDetector(
                onTap: () {
                  // Navigate to QR scanner
                },
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      height: 72,
                      width: 72,
                      decoration: BoxDecoration(
                        color: primary,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white,
                          width: 6,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: primary.withValues(alpha: 0.2),
                            blurRadius: 10,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.qr_code_scanner,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                    const SizedBox(height: 3),
                    const Text(
                      "Scan",
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.black54,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // SUMMARY CARD WIDGET
  Widget summaryCard(
    IconData icon,
    String count,
    String title,
    Color background,
    Color iconColor,
  ) {
    return Container(
      height: 112,
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(15),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: iconColor, size: 25),
          const SizedBox(height: 5),
          Text(
            count,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            title,
            style: const TextStyle(
              fontSize: 13,
              color: Colors.black54,
            ),
          ),
        ],
      ),
    );
  }

  // QUICK ACTION WIDGET
  Widget quickAction(
    IconData icon,
    String title,
    Color iconColor,
    Color background,
  ) {
    return InkWell(
      onTap: () {
        // Add navigation here
      },
      borderRadius: BorderRadius.circular(17),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(17),
          border: Border.all(
            color: Colors.grey.withValues(alpha: 0.08),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: background,
                borderRadius: BorderRadius.circular(13),
              ),
              child: Icon(
                icon,
                color: iconColor,
                size: 25,
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios,
              size: 15,
              color: Colors.black54,
            ),
          ],
        ),
      ),
    );
  }

  // BOTTOM NAV ITEM
  Widget bottomItem(
    IconData icon,
    String title,
    bool selected,
  ) {
    return SizedBox(
      width: 80,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 29,
            color: selected ? primary : Colors.blueGrey,
          ),
          const SizedBox(height: 3),
          Text(
            title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: selected ? primary : Colors.blueGrey,
            ),
          ),
          const SizedBox(height: 3),
          if (selected)
            Container(
              height: 4,
              width: 45,
              decoration: BoxDecoration(
                color: primary,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
        ],
      ),
    );
  }
}
