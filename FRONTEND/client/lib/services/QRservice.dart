import 'dart:convert';

class Qrservice {
  
  static String generateQrData(String token, int entry,int nonce){
    final parts = token.split('.');
    if(parts.length != 3){
      throw const FormatException('Invalid JWT token');
    }

    final payload = utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
    final decodedPayload = jsonDecode(payload);
    final uid = decodedPayload['id'];

    if(uid == null){
      throw const FormatException('Visitor ID not found in token');
    }

    return jsonEncode({
      'uid' : uid.toString(),
      'entry' : entry,
      'nonce': nonce,
    });
  }
}