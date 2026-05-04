class AppUser {
  AppUser({
    required this.uid,
    required this.email,
    this.displayName,
    this.photoUrl,
    this.metadata,
  });

  final String uid;
  final String email;
  final String? displayName;
  final String? photoUrl;
  final Map<String, dynamic>? metadata;

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      uid: (json['uid'] ?? json['id'] ?? json['user_id'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      displayName: json['displayName']?.toString() ??
          json['display_name']?.toString() ??
          json['name']?.toString(),
      photoUrl: json['photoURL']?.toString() ?? json['photo_url']?.toString(),
      metadata: (json['metadata'] is Map)
          ? Map<String, dynamic>.from(json['metadata'] as Map)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'uid': uid,
        'email': email,
        'displayName': displayName,
        'photoURL': photoUrl,
        if (metadata != null) 'metadata': metadata,
      };

  String get initials {
    final source = (displayName?.isNotEmpty ?? false)
        ? displayName!
        : email.split('@').first;
    final clean = source.trim();
    if (clean.isEmpty) return 'U';
    final parts = clean.split(RegExp(r'[\s._-]+'));
    if (parts.length == 1) {
      return parts.first.substring(0, parts.first.length < 2 ? 1 : 2).toUpperCase();
    }
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
  }
}
