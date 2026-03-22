import AccessControl "authorization/access-control";
import AuthMixin "authorization/MixinAuthorization";
import BlobMixin "blob-storage/Mixin";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Option "mo:core/Option";
import Order "mo:core/Order";

actor {
  stable var _accessControlState : AccessControl.AccessControlState = AccessControl.initState();
  include AuthMixin(_accessControlState);
  include BlobMixin();

  public type UserProfile = {
    principal : Principal;
    username : Text;
    bio : Text;
    avatarKey : Text;
    createdAt : Int;
  };

  public type Video = {
    id : Text;
    creator : Principal;
    title : Text;
    description : Text;
    hashtags : [Text];
    videoKey : Text;
    thumbnailKey : Text;
    createdAt : Int;
    views : Nat;
  };

  public type Comment = {
    id : Text;
    videoId : Text;
    author : Principal;
    text : Text;
    createdAt : Int;
  };

  public type Notification = {
    id : Text;
    recipient : Principal;
    sender : Principal;
    notifType : Text;
    videoId : ?Text;
    read : Bool;
    createdAt : Int;
  };

  public type Report = {
    id : Text;
    videoId : Text;
    reporter : Principal;
    reason : Text;
    createdAt : Int;
  };

  stable var _users : [(Text, UserProfile)] = [];
  stable var _videos : [(Text, Video)] = [];
  stable var _comments : [(Text, Comment)] = [];
  stable var _notifications : [(Text, Notification)] = [];
  stable var _likes : [(Text, [Principal])] = [];
  stable var _following : [(Text, [Principal])] = [];
  stable var _savedVideos : [(Text, [Text])] = [];
  stable var _hiddenVideos : [(Text, [Text])] = [];
  stable var _pinnedVideos : [(Text, Text)] = [];
  stable var _reports : [(Text, Report)] = [];
  stable var _videoCounter : Nat = 0;
  stable var _commentCounter : Nat = 0;
  stable var _notifCounter : Nat = 0;
  stable var _reportCounter : Nat = 0;

  var users : Map.Map<Text, UserProfile> = Map.fromArray(_users);
  var videos : Map.Map<Text, Video> = Map.fromArray(_videos);
  var comments : Map.Map<Text, Comment> = Map.fromArray(_comments);
  var notifications : Map.Map<Text, Notification> = Map.fromArray(_notifications);
  var likes : Map.Map<Text, [Principal]> = Map.fromArray(_likes);
  var following : Map.Map<Text, [Principal]> = Map.fromArray(_following);
  var savedVideos : Map.Map<Text, [Text]> = Map.fromArray(_savedVideos);
  var hiddenVideos : Map.Map<Text, [Text]> = Map.fromArray(_hiddenVideos);
  var pinnedVideos : Map.Map<Text, Text> = Map.fromArray(_pinnedVideos);
  var reports : Map.Map<Text, Report> = Map.fromArray(_reports);

  system func preupgrade() {
    _users := users.toArray();
    _videos := videos.toArray();
    _comments := comments.toArray();
    _notifications := notifications.toArray();
    _likes := likes.toArray();
    _following := following.toArray();
    _savedVideos := savedVideos.toArray();
    _hiddenVideos := hiddenVideos.toArray();
    _pinnedVideos := pinnedVideos.toArray();
    _reports := reports.toArray();
  };

  func pkey(p : Principal) : Text = p.toText();

  func nextVideoId() : Text {
    _videoCounter += 1;
    "v" # _videoCounter.toText();
  };

  func nextCommentId() : Text {
    _commentCounter += 1;
    "c" # _commentCounter.toText();
  };

  func nextNotifId() : Text {
    _notifCounter += 1;
    "n" # _notifCounter.toText();
  };

  func nextReportId() : Text {
    _reportCounter += 1;
    "r" # _reportCounter.toText();
  };

  func hasPrincipal(arr : [Principal], p : Principal) : Bool {
    var found = false;
    for (x in arr.values()) {
      if (Principal.equal(x, p)) { found := true; };
    };
    found;
  };

  func hasText(arr : [Text], t : Text) : Bool {
    var found = false;
    for (x in arr.values()) {
      if (x == t) { found := true; };
    };
    found;
  };

  func removeText(arr : [Text], t : Text) : [Text] =
    arr.filter(func(x : Text) : Bool { x != t });

  func removePrincipal(arr : [Principal], p : Principal) : [Principal] =
    arr.filter(func(x : Principal) : Bool { not Principal.equal(x, p) });

  func compareVideoDesc(a : Video, b : Video) : Order.Order =
    Int.compare(b.createdAt, a.createdAt);

  func compareVideoByViews(a : Video, b : Video) : Order.Order =
    Nat.compare(b.views, a.views);

  func compareVideoByLikes(a : Video, b : Video) : Order.Order {
    let la = likes.get(a.id).get([]).size();
    let lb = likes.get(b.id).get([]).size();
    Nat.compare(lb, la);
  };

  func compareCommentAsc(a : Comment, b : Comment) : Order.Order =
    Int.compare(a.createdAt, b.createdAt);

  func compareNotifDesc(a : Notification, b : Notification) : Order.Order =
    Int.compare(b.createdAt, a.createdAt);

  func createNotif(recipient : Principal, sender : Principal, notifType : Text, videoId : ?Text) {
    if (Principal.equal(recipient, sender)) return;
    let id = nextNotifId();
    notifications.add(id, { id; recipient; sender; notifType; videoId; read = false; createdAt = Time.now() });
  };

  // ===== USERS =====
  public shared ({ caller }) func registerUser(username : Text, bio : Text, avatarKey : Text) : async () {
    users.add(pkey(caller), { principal = caller; username; bio; avatarKey; createdAt = Time.now() });
  };

  public query func getProfile(p : Principal) : async ?UserProfile =
    async users.get(pkey(p));

  public shared ({ caller }) func updateProfile(username : Text, bio : Text, avatarKey : Text) : async () {
    let key = pkey(caller);
    let createdAt = switch (users.get(key)) {
      case (?u) u.createdAt;
      case null Time.now();
    };
    users.add(key, { principal = caller; username; bio; avatarKey; createdAt });
  };

  public shared ({ caller }) func followUser(target : Principal) : async () {
    let key = pkey(caller);
    let current = following.get(key).get([]);
    if (not hasPrincipal(current, target)) {
      following.add(key, current.concat([target]));
      createNotif(target, caller, "follow", null);
    };
  };

  public shared ({ caller }) func unfollowUser(target : Principal) : async () {
    let key = pkey(caller);
    let current = following.get(key).get([]);
    following.add(key, removePrincipal(current, target));
  };

  public query func getFollowing(p : Principal) : async [Principal] =
    async following.get(pkey(p)).get([]);

  public query func getFollowers(p : Principal) : async [Principal] {
    var result : [Principal] = [];
    for ((ownerKey, list) in following.entries()) {
      if (hasPrincipal(list, p)) {
        switch (users.get(ownerKey)) {
          case (?u) { result := result.concat([u.principal]); };
          case null {};
        };
      };
    };
    result;
  };

  public query func getUserStats(p : Principal) : async { videoCount : Nat; followerCount : Nat; followingCount : Nat } {
    var videoCount = 0;
    var followerCount = 0;
    for ((_, v) in videos.entries()) {
      if (Principal.equal(v.creator, p)) { videoCount += 1; };
    };
    for ((_, list) in following.entries()) {
      if (hasPrincipal(list, p)) { followerCount += 1; };
    };
    let followingCount = following.get(pkey(p)).get([]).size();
    { videoCount; followerCount; followingCount };
  };

  // ===== VIDEOS =====
  public shared ({ caller }) func postVideo(title : Text, description : Text, hashtags : [Text], videoKey : Text, thumbnailKey : Text) : async Text {
    let id = nextVideoId();
    videos.add(id, { id; creator = caller; title; description; hashtags; videoKey; thumbnailKey; createdAt = Time.now(); views = 0 });
    id;
  };

  public query func getFeed(offset : Nat, limit : Nat) : async [Video] {
    var arr : [Video] = [];
    for ((_, v) in videos.entries()) { arr := arr.concat([v]); };
    let sorted = arr.sort(compareVideoDesc);
    let size = sorted.size();
    if (offset >= size) return [];
    let end = Nat.min(offset + limit, size);
    sorted.sliceToArray(offset, end);
  };

  public query func getFollowingFeed(p : Principal, offset : Nat, limit : Nat) : async [Video] {
    let followed = following.get(pkey(p)).get([]);
    var arr : [Video] = [];
    for ((_, v) in videos.entries()) {
      if (hasPrincipal(followed, v.creator)) { arr := arr.concat([v]); };
    };
    let sorted = arr.sort(compareVideoDesc);
    let size = sorted.size();
    if (offset >= size) return [];
    let end = Nat.min(offset + limit, size);
    sorted.sliceToArray(offset, end);
  };

  public query func getTrendingFeed(offset : Nat, limit : Nat) : async [Video] {
    var arr : [Video] = [];
    for ((_, v) in videos.entries()) { arr := arr.concat([v]); };
    let sorted = arr.sort(compareVideoByViews);
    let size = sorted.size();
    if (offset >= size) return [];
    let end = Nat.min(offset + limit, size);
    sorted.sliceToArray(offset, end);
  };

  public query func getPopularFeed(offset : Nat, limit : Nat) : async [Video] {
    var arr : [Video] = [];
    for ((_, v) in videos.entries()) { arr := arr.concat([v]); };
    let sorted = arr.sort(compareVideoByLikes);
    let size = sorted.size();
    if (offset >= size) return [];
    let end = Nat.min(offset + limit, size);
    sorted.sliceToArray(offset, end);
  };

  public query func getUserVideos(p : Principal) : async [Video] {
    var arr : [Video] = [];
    for ((_, v) in videos.entries()) {
      if (Principal.equal(v.creator, p)) { arr := arr.concat([v]); };
    };
    arr.sort(compareVideoDesc);
  };

  public query func getVideoById(id : Text) : async ?Video =
    async videos.get(id);

  public shared ({ caller }) func deleteVideo(id : Text) : async Bool {
    switch (videos.get(id)) {
      case null false;
      case (?v) {
        if (not Principal.equal(v.creator, caller)) return false;
        videos.remove(id);
        true;
      };
    };
  };

  public shared ({ caller }) func updateVideo(id : Text, title : Text, description : Text, hashtags : [Text]) : async Bool {
    switch (videos.get(id)) {
      case null false;
      case (?v) {
        if (not Principal.equal(v.creator, caller)) return false;
        videos.add(id, { id = v.id; creator = v.creator; title; description; hashtags; videoKey = v.videoKey; thumbnailKey = v.thumbnailKey; createdAt = v.createdAt; views = v.views });
        true;
      };
    };
  };

  public shared func incrementView(id : Text) : async () {
    switch (videos.get(id)) {
      case null {};
      case (?v) {
        videos.add(id, { id = v.id; creator = v.creator; title = v.title; description = v.description; hashtags = v.hashtags; videoKey = v.videoKey; thumbnailKey = v.thumbnailKey; createdAt = v.createdAt; views = v.views + 1 });
      };
    };
  };

  // ===== SAVE VIDEOS =====
  public shared ({ caller }) func saveVideo(videoId : Text) : async () {
    let key = pkey(caller);
    let current = savedVideos.get(key).get([]);
    if (not hasText(current, videoId)) {
      savedVideos.add(key, current.concat([videoId]));
    };
  };

  public shared ({ caller }) func unsaveVideo(videoId : Text) : async () {
    let key = pkey(caller);
    let current = savedVideos.get(key).get([]);
    savedVideos.add(key, removeText(current, videoId));
  };

  public shared query ({ caller }) func getSavedVideos() : async [Video] {
    let key = pkey(caller);
    let ids = savedVideos.get(key).get([]);
    var arr : [Video] = [];
    for (id in ids.values()) {
      switch (videos.get(id)) {
        case (?v) { arr := arr.concat([v]); };
        case null {};
      };
    };
    arr;
  };

  public shared query ({ caller }) func isVideoSaved(videoId : Text) : async Bool {
    let key = pkey(caller);
    hasText(savedVideos.get(key).get([]), videoId);
  };

  // ===== HIDE VIDEOS =====
  public shared ({ caller }) func hideVideo(videoId : Text) : async () {
    let key = pkey(caller);
    let current = hiddenVideos.get(key).get([]);
    if (not hasText(current, videoId)) {
      hiddenVideos.add(key, current.concat([videoId]));
    };
  };

  public shared ({ caller }) func unhideVideo(videoId : Text) : async () {
    let key = pkey(caller);
    let current = hiddenVideos.get(key).get([]);
    hiddenVideos.add(key, removeText(current, videoId));
  };

  // ===== PIN VIDEOS =====
  public shared ({ caller }) func pinVideo(videoId : Text) : async Bool {
    switch (videos.get(videoId)) {
      case null false;
      case (?v) {
        if (not Principal.equal(v.creator, caller)) return false;
        pinnedVideos.add(pkey(caller), videoId);
        true;
      };
    };
  };

  public shared ({ caller }) func unpinVideo() : async () {
    pinnedVideos.remove(pkey(caller));
  };

  public query func getPinnedVideo(p : Principal) : async ?Video {
    switch (pinnedVideos.get(pkey(p))) {
      case null null;
      case (?id) videos.get(id);
    };
  };

  // ===== REPORT =====
  public shared ({ caller }) func reportVideo(videoId : Text, reason : Text) : async () {
    let id = nextReportId();
    reports.add(id, { id; videoId; reporter = caller; reason; createdAt = Time.now() });
  };

  // ===== LIKES =====
  public shared ({ caller }) func likeVideo(videoId : Text) : async () {
    let current = likes.get(videoId).get([]);
    if (not hasPrincipal(current, caller)) {
      likes.add(videoId, current.concat([caller]));
      switch (videos.get(videoId)) {
        case (?v) { createNotif(v.creator, caller, "like", ?videoId); };
        case null {};
      };
    };
  };

  public shared ({ caller }) func unlikeVideo(videoId : Text) : async () {
    let current = likes.get(videoId).get([]);
    likes.add(videoId, removePrincipal(current, caller));
  };

  public query func getLikeCount(videoId : Text) : async Nat =
    async likes.get(videoId).get([]).size();

  public shared query ({ caller }) func didCallerLike(videoId : Text) : async Bool =
    async hasPrincipal(likes.get(videoId).get([]), caller);

  // ===== COMMENTS =====
  public shared ({ caller }) func addComment(videoId : Text, text : Text) : async Text {
    let id = nextCommentId();
    comments.add(id, { id; videoId; author = caller; text; createdAt = Time.now() });
    switch (videos.get(videoId)) {
      case (?v) { createNotif(v.creator, caller, "comment", ?videoId); };
      case null {};
    };
    id;
  };

  public query func getComments(videoId : Text) : async [Comment] {
    var arr : [Comment] = [];
    for ((_, c) in comments.entries()) {
      if (c.videoId == videoId) { arr := arr.concat([c]); };
    };
    arr.sort(compareCommentAsc);
  };

  public shared ({ caller }) func deleteComment(commentId : Text) : async Bool {
    switch (comments.get(commentId)) {
      case null false;
      case (?c) {
        if (not Principal.equal(c.author, caller)) return false;
        comments.remove(commentId);
        true;
      };
    };
  };

  // ===== SEARCH =====
  public query func searchVideos(term : Text) : async [Video] {
    let q = term.toLower();
    var arr : [Video] = [];
    for ((_, v) in videos.entries()) {
      let match = v.title.toLower().contains(#text q) or v.description.toLower().contains(#text q);
      var tagMatch = false;
      for (h in v.hashtags.values()) {
        if (h.toLower().contains(#text q)) { tagMatch := true; };
      };
      if (match or tagMatch) { arr := arr.concat([v]); };
    };
    arr;
  };

  public query func searchUsers(term : Text) : async [UserProfile] {
    let q = term.toLower();
    var arr : [UserProfile] = [];
    for ((_, u) in users.entries()) {
      if (u.username.toLower().contains(#text q)) { arr := arr.concat([u]); };
    };
    arr;
  };

  // ===== NOTIFICATIONS =====
  public shared query ({ caller }) func getNotifications() : async [Notification] {
    var arr : [Notification] = [];
    for ((_, n) in notifications.entries()) {
      if (Principal.equal(n.recipient, caller)) { arr := arr.concat([n]); };
    };
    arr.sort(compareNotifDesc);
  };

  public shared ({ caller }) func markNotificationsRead() : async () {
    for ((id, n) in notifications.entries()) {
      if (Principal.equal(n.recipient, caller) and not n.read) {
        notifications.add(id, { id = n.id; recipient = n.recipient; sender = n.sender; notifType = n.notifType; videoId = n.videoId; read = true; createdAt = n.createdAt });
      };
    };
  };
};
