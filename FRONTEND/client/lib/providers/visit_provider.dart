import 'package:flutter_riverpod/legacy.dart';


//1 = ENTRY, 0 = EXIT
final visitProvider = StateProvider<int>((ref)=>1);