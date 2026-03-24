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

  public type Post = {
    id : Text;
    creator : Principal;
    imageKey : Text;
    caption : Text;
    hashtags : [Text];
    createdAt : Int;
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

  public type Story = {
    id : Text;
    creator : Principal;
    mediaKey : Text;
    mediaType : Text;
    caption : Text;
    createdAt : Int;
    expiresAt : Int;
  };

  public type UserSettings = {
    isPrivate : Bool;
    notificationsEnabled : Bool;
  };

  public type Match = {
    id : Text;
    user1 : Principal;
    user2 : Principal;
    createdAt : Int;
  };

  public type Message = {
    id : Text;
    conversationId : Text;
    sender : Principal;
    text : Text;
    createdAt : Int;
  };

  public type Duet = {
    id : Text;
    originalVideoId : Text;
    creator : Principal;
    videoKey : Text;
    thumbnailKey : Text;
    caption : Text;
    createdAt : Int;
  };

  public type StoryComment = {
    id : Text;
    storyId : Text;
    author : Principal;
    text : Text;
    createdAt : Int;
  };

  public type StoryReaction = {
    id : Text;
    storyId : Text;
    user : Principal;
    emoji : Text;
    createdAt : Int;
  };

  public type FollowRequest = {
    id : Text;
    from : Principal;
    to : Principal;
    createdAt : Int;
  };

  stable var _users : [(Text, UserProfile)] = [];
  stable var _coverPhotoKeys : [(Text, Text)] = [];
  stable var _videos : [(Text, Video)] = [];
  stable var _posts : [(Text, Post)] = [];
  stable var _comments : [(Text, Comment)] = [];
  stable var _notifications : [(Text, Notification)] = [];
  stable var _likes : [(Text, [Principal])] = [];
  stable var _postLikes : [(Text, [Principal])] = [];
  stable var _following : [(Text, [Principal])] = [];
  stable var _savedVideos : [(Text, [Text])] = [];
  stable var _hiddenVideos : [(Text, [Text])] = [];
  stable var _pinnedVideos : [(Text, Text)] = [];
  stable var _reports : [(Text, Report)] = [];
  stable var _stories : [(Text, Story)] = [];
  stable var _storyViews : [(Text, [Text])] = [];
  stable var _userSettings : [(Text, UserSettings)] = [];
  stable var _swipedRight : [(Text, [Text])] = [];
  stable var _swipedLeft : [(Text, [Text])] = [];
  stable var _matches : [(Text, Match)] = [];
  stable var _messages : [(Text, Message)] = [];
  stable var _duets : [(Text, Duet)] = [];
  stable var _storyComments : [(Text, StoryComment)] = [];
  stable var _storyReactions : [(Text, StoryReaction)] = [];
  stable var _followRequests : [(Text, FollowRequest)] = [];
  stable var _videoCounter : Nat = 0;
  stable var _commentCounter : Nat = 0;
  stable var _notifCounter : Nat = 0;
  stable var _reportCounter : Nat = 0;
  stable var _storyCounter : Nat = 0;
  stable var _postCounter : Nat = 0;
  stable var _matchCounter : Nat = 0;
  stable var _messageCounter : Nat = 0;
  stable var _duetCounter : Nat = 0;
  stable var _storyCommentCounter : Nat = 0;
  stable var _storyReactionCounter : Nat = 0;
  stable var _followRequestCounter : Nat = 0;

  var users : Map.Map<Text, UserProfile> = Map.fromArray(_users);
  var coverPhotoKeys : Map.Map<Text, Text> = Map.fromArray(_coverPhotoKeys);
  var videos : Map.Map<Text, Video> = Map.fromArray(_videos);
  var posts : Map.Map<Text, Post> = Map.fromArray(_posts);
  var comments : Map.Map<Text, Comment> = Map.fromArray(_comments);
  var notifications : Map.Map<Text, Notification> = Map.fromArray(_notifications);
  var likes : Map.Map<Text, [Principal]> = Map.fromArray(_likes);
  var postLikes : Map.Map<Text, [Principal]> = Map.fromArray(_postLikes);
  var following : Map.Map<Text, [Principal]> = Map.fromArray(_following);
  var savedVideos : Map.Map<Text, [Text]> = Map.fromArray(_savedVideos);
  var hiddenVideos : Map.Map<Text, [Text]> = Map.fromArray(_hiddenVideos);
  var pinnedVideos : Map.Map<Text, Text> = Map.fromArray(_pinnedVideos);
  var reports : Map.Map<Text, Report> = Map.fromArray(_reports);
  var stories : Map.Map<Text, Story> = Map.fromArray(_stories);
  var storyViews : Map.Map<Text, [Text]> = Map.fromArray(_storyViews);
  var userSettings : Map.Map<Text, UserSettings> = Map.fromArray(_userSettings);
  var swipedRight : Map.Map<Text, [Text]> = Map.fromArray(_swipedRight);
  var swipedLeft : Map.Map<Text, [Text]> = Map.fromArray(_swipedLeft);
  var matches : Map.Map<Text, Match> = Map.fromArray(_matches);
  var messages : Map.Map<Text, Message> = Map.fromArray(_messages);
  var duets : Map.Map<Text, Duet> = Map.fromArray(_duets);
  var storyComments : Map.Map<Text, StoryComment> = Map.fromArray(_storyComments);
  var storyReactions : Map.Map<Text, StoryReaction> = Map.fromArray(_storyReactions);
  var followRequests : Map.Map<Text, FollowRequest> = Map.fromArray(_followRequests);

  system func preupgrade() {
    _users := users.toArray();
    _coverPhotoKeys := coverPhotoKeys.toArray();
    _videos := videos.toArray();
    _posts := posts.toArray();
    _comments := comments.toArray();
    _notifications := notifications.toArray();
    _likes := likes.toArray();
    _postLikes := postLikes.toArray();
    _following := following.toArray();
    _savedVideos := savedVideos.toArray();
    _hiddenVideos := hiddenVideos.toArray();
    _pinnedVideos := pinnedVideos.toArray();
    _reports := reports.toArray();
    _stories := stories.toArray();
    _storyViews := storyViews.toArray();
    _userSettings := userSettings.toArray();
    _swipedRight := swipedRight.toArray();
    _swipedLeft := swipedLeft.toArray();
    _matches := matches.toArray();
    _messages := messages.toArray();
    _duets := duets.toArray();
    _storyComments := storyComments.toArray();
    _storyReactions := storyReactions.toArray();
    _followRequests := followRequests.toArray();
  };

  func pkey(p : Principal) : Text = p.toText();

  func nextVideoId() : Text { _videoCounter += 1; "v" # _videoCounter.toText() };
  func nextCommentId() : Text { _commentCounter += 1; "c" # _commentCounter.toText() };
  func nextNotifId() : Text { _notifCounter += 1; "n" # _notifCounter.toText() };
  func nextReportId() : Text { _reportCounter += 1; "r" # _reportCounter.toText() };
  func nextStoryId() : Text { _storyCounter += 1; "s" # _storyCounter.toText() };
  func nextPostId() : Text { _postCounter += 1; "p" # _postCounter.toText() };
  func nextMatchId() : Text { _matchCounter += 1; "m" # _matchCounter.toText() };
  func nextMessageId() : Text { _messageCounter += 1; "msg" # _messageCounter.toText() };
  func nextDuetId() : Text { _duetCounter += 1; "d" # _duetCounter.toText() };
  func nextStoryCommentId() : Text { _storyCommentCounter += 1; "sc" # _storyCommentCounter.toText() };
  func nextStoryReactionId() : Text { _storyReactionCounter += 1; "sr" # _storyReactionCounter.toText() };
  func nextFollowRequestId() : Text { _followRequestCounter += 1; "fr" # _followRequestCounter.toText() };

  func hasPrincipal(arr : [Principal], p : Principal) : Bool {
    var found = false;
    for (x in arr.values()) { if (Principal.equal(x, p)) { found := true } };
    found;
  };

  func hasText(arr : [Text], t : Text) : Bool {
    var found = false;
    for (x in arr.values()) { if (x == t) { found := true } };
    found;
  };

  func removeText(arr : [Text], t : Text) : [Text] =
    arr.filter(func(x : Text) : Bool { x != t });

  func removePrincipal(arr : [Principal], p : Principal) : [Principal] =
    arr.filter(func(x : Principal) : Bool { not Principal.equal(x, p) });

  func compareVideoDesc(a : Video, b : Video) : Order.Order = Int.compare(b.createdAt, a.createdAt);
  func compareVideoByViews(a : Video, b : Video) : Order.Order = Nat.compare(b.views, a.views);
  func compareVideoByLikes(a : Video, b : Video) : Order.Order {
    let la = likes.get(a.id).get([]).size();
    let lb = likes.get(b.id).get([]).size();
    Nat.compare(lb, la);
  };
  func compareCommentAsc(a : Comment, b : Comment) : Order.Order = Int.compare(a.createdAt, b.createdAt);
  func compareNotifDesc(a : Notification, b : Notification) : Order.Order = Int.compare(b.createdAt, a.createdAt);
  func compareStoryDesc(a : Story, b : Story) : Order.Order = Int.compare(b.createdAt, a.createdAt);
  func comparePostDesc(a : Post, b : Post) : Order.Order = Int.compare(b.createdAt, a.createdAt);
  func compareMessageAsc(a : Message, b : Message) : Order.Order = Int.compare(a.createdAt, b.createdAt);
  func compareDuetDesc(a : Duet, b : Duet) : Order.Order = Int.compare(b.createdAt, a.createdAt);

  func createNotif(recipient : Principal, sender : Principal, notifType : Text, videoId : ?Text) {
    if (Principal.equal(recipient, sender)) return;
    let id = nextNotifId();
    notifications.add(id, { id; recipient; sender; notifType; videoId; read = false; createdAt = Time.now() });
  };

  func conversationId(a : Principal, b : Principal) : Text {
    let ak = pkey(a);
    let bk = pkey(b);
    if (ak < bk) { ak # "_" # bk } else { bk # "_" # ak };
  };

  func isPrivateAccount(p : Principal) : Bool {
    switch (userSettings.get(pkey(p))) {
      case (?s) s.isPrivate;
      case null false;
    };
  };

  // ===== USERS =====
  public shared ({ caller }) func registerUser(username : Text, bio : Text, avatarKey : Text) : async () {
    users.add(pkey(caller), { principal = caller; username; bio; avatarKey; createdAt = Time.now() });
  };

  public query func getProfile(p : Principal) : async ?UserProfile = async users.get(pkey(p));

  public shared ({ caller }) func updateProfile(username : Text, bio : Text, avatarKey : Text) : async () {
    let key = pkey(caller);
    let createdAt = switch (users.get(key)) { case (?u) u.createdAt; case null Time.now() };
    users.add(key, { principal = caller; username; bio; avatarKey; createdAt });
  };

  public shared ({ caller }) func updateCoverPhoto(coverPhotoKey : Text) : async () {
    coverPhotoKeys.add(pkey(caller), coverPhotoKey);
  };

  public query func getCoverPhoto(p : Principal) : async ?Text {
    coverPhotoKeys.get(pkey(p));
  };

  public shared ({ caller }) func followUser(target : Principal) : async () {
    let key = pkey(caller);
    let current = following.get(key).get([]);
    if (hasPrincipal(current, target)) return;
    if (isPrivateAccount(target)) {
      // Check if a pending request already exists
      var exists = false;
      for ((_, req) in followRequests.entries()) {
        if (Principal.equal(req.from, caller) and Principal.equal(req.to, target)) { exists := true };
      };
      if (not exists) {
        let id = nextFollowRequestId();
        followRequests.add(id, { id; from = caller; to = target; createdAt = Time.now() });
        createNotif(target, caller, "follow_request", null);
      };
    } else {
      following.add(key, current.concat([target]));
      createNotif(target, caller, "follow", null);
    };
  };

  public shared ({ caller }) func unfollowUser(target : Principal) : async () {
    let key = pkey(caller);
    following.add(key, removePrincipal(following.get(key).get([]), target));
    // Also remove any pending follow request
    for ((reqId, req) in followRequests.entries()) {
      if (Principal.equal(req.from, caller) and Principal.equal(req.to, target)) {
        followRequests.remove(reqId);
      };
    };
  };

  public query func getFollowing(p : Principal) : async [Principal] = async following.get(pkey(p)).get([]);

  public query func getFollowers(p : Principal) : async [Principal] {
    var result : [Principal] = [];
    for ((ownerKey, list) in following.entries()) {
      if (hasPrincipal(list, p)) {
        switch (users.get(ownerKey)) {
          case (?u) { result := result.concat([u.principal]) };
          case null {};
        };
      };
    };
    result;
  };

  public query func getUserStats(p : Principal) : async { videoCount : Nat; followerCount : Nat; followingCount : Nat } {
    var videoCount = 0;
    var followerCount = 0;
    for ((_, v) in videos.entries()) { if (Principal.equal(v.creator, p)) { videoCount += 1 } };
    for ((_, list) in following.entries()) { if (hasPrincipal(list, p)) { followerCount += 1 } };
    { videoCount; followerCount; followingCount = following.get(pkey(p)).get([]).size() };
  };

  public query func getAllUsers() : async [UserProfile] {
    var arr : [UserProfile] = [];
    for ((_, u) in users.entries()) { arr := arr.concat([u]) };
    arr;
  };

  // ===== FOLLOW REQUESTS =====
  public shared ({ caller }) func sendFollowRequest(target : Principal) : async () {
    var exists = false;
    for ((_, req) in followRequests.entries()) {
      if (Principal.equal(req.from, caller) and Principal.equal(req.to, target)) { exists := true };
    };
    if (not exists) {
      let id = nextFollowRequestId();
      followRequests.add(id, { id; from = caller; to = target; createdAt = Time.now() });
      createNotif(target, caller, "follow_request", null);
    };
  };

  public shared ({ caller }) func acceptFollowRequest(requestId : Text) : async Bool {
    switch (followRequests.get(requestId)) {
      case null false;
      case (?req) {
        if (not Principal.equal(req.to, caller)) return false;
        followRequests.remove(requestId);
        let fromKey = pkey(req.from);
        let current = following.get(fromKey).get([]);
        if (not hasPrincipal(current, caller)) {
          following.add(fromKey, current.concat([caller]));
        };
        createNotif(req.from, caller, "follow_request_accepted", null);
        true;
      };
    };
  };

  public shared ({ caller }) func declineFollowRequest(requestId : Text) : async Bool {
    switch (followRequests.get(requestId)) {
      case null false;
      case (?req) {
        if (not Principal.equal(req.to, caller)) return false;
        followRequests.remove(requestId);
        true;
      };
    };
  };

  public shared ({ caller }) func cancelFollowRequest(target : Principal) : async () {
    for ((reqId, req) in followRequests.entries()) {
      if (Principal.equal(req.from, caller) and Principal.equal(req.to, target)) {
        followRequests.remove(reqId);
      };
    };
  };

  public shared query ({ caller }) func getPendingFollowRequests() : async [FollowRequest] {
    var arr : [FollowRequest] = [];
    for ((_, req) in followRequests.entries()) {
      if (Principal.equal(req.to, caller)) { arr := arr.concat([req]) };
    };
    arr;
  };

  public shared query ({ caller }) func hasPendingFollowRequest(target : Principal) : async Bool {
    var found = false;
    for ((_, req) in followRequests.entries()) {
      if (Principal.equal(req.from, caller) and Principal.equal(req.to, target)) { found := true };
    };
    found;
  };

  // ===== USER SETTINGS =====
  public shared query ({ caller }) func getUserSettings() : async UserSettings {
    switch (userSettings.get(pkey(caller))) {
      case (?s) s;
      case null (({ isPrivate = false; notificationsEnabled = true } : UserSettings));
    };
  };

  public shared ({ caller }) func updateUserSettings(isPrivate : Bool, notificationsEnabled : Bool) : async () {
    userSettings.add(pkey(caller), { isPrivate; notificationsEnabled });
  };

  // ===== VIDEOS =====
  public shared ({ caller }) func postVideo(title : Text, description : Text, hashtags : [Text], videoKey : Text, thumbnailKey : Text) : async Text {
    let id = nextVideoId();
    videos.add(id, { id; creator = caller; title; description; hashtags; videoKey; thumbnailKey; createdAt = Time.now(); views = 0 });
    id;
  };

  public query func getFeed(offset : Nat, limit : Nat) : async [Video] {
    var arr : [Video] = [];
    for ((_, v) in videos.entries()) { arr := arr.concat([v]) };
    let sorted = arr.sort(compareVideoDesc);
    let size = sorted.size();
    if (offset >= size) return [];
    sorted.sliceToArray(offset, Nat.min(offset + limit, size));
  };

  public query func getFollowingFeed(p : Principal, offset : Nat, limit : Nat) : async [Video] {
    let followed = following.get(pkey(p)).get([]);
    var arr : [Video] = [];
    for ((_, v) in videos.entries()) { if (hasPrincipal(followed, v.creator)) { arr := arr.concat([v]) } };
    let sorted = arr.sort(compareVideoDesc);
    let size = sorted.size();
    if (offset >= size) return [];
    sorted.sliceToArray(offset, Nat.min(offset + limit, size));
  };

  public query func getTrendingFeed(offset : Nat, limit : Nat) : async [Video] {
    var arr : [Video] = [];
    for ((_, v) in videos.entries()) { arr := arr.concat([v]) };
    let sorted = arr.sort(compareVideoByViews);
    let size = sorted.size();
    if (offset >= size) return [];
    sorted.sliceToArray(offset, Nat.min(offset + limit, size));
  };

  public query func getPopularFeed(offset : Nat, limit : Nat) : async [Video] {
    var arr : [Video] = [];
    for ((_, v) in videos.entries()) { arr := arr.concat([v]) };
    let sorted = arr.sort(compareVideoByLikes);
    let size = sorted.size();
    if (offset >= size) return [];
    sorted.sliceToArray(offset, Nat.min(offset + limit, size));
  };

  public query func getUserVideos(p : Principal) : async [Video] {
    var arr : [Video] = [];
    for ((_, v) in videos.entries()) { if (Principal.equal(v.creator, p)) { arr := arr.concat([v]) } };
    arr.sort(compareVideoDesc);
  };

  public query func getVideoById(id : Text) : async ?Video = async videos.get(id);

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

  // ===== PHOTO POSTS (Instagram) =====
  public shared ({ caller }) func postPhoto(imageKey : Text, caption : Text, hashtags : [Text]) : async Text {
    let id = nextPostId();
    posts.add(id, { id; creator = caller; imageKey; caption; hashtags; createdAt = Time.now() });
    id;
  };

  public query func getPhotoPosts(offset : Nat, limit : Nat) : async [Post] {
    var arr : [Post] = [];
    for ((_, p) in posts.entries()) { arr := arr.concat([p]) };
    let sorted = arr.sort(comparePostDesc);
    let size = sorted.size();
    if (offset >= size) return [];
    sorted.sliceToArray(offset, Nat.min(offset + limit, size));
  };

  public query func getUserPhotos(p : Principal) : async [Post] {
    var arr : [Post] = [];
    for ((_, post) in posts.entries()) { if (Principal.equal(post.creator, p)) { arr := arr.concat([post]) } };
    arr.sort(comparePostDesc);
  };

  public query func getPostById(id : Text) : async ?Post = async posts.get(id);

  public shared ({ caller }) func deletePost(id : Text) : async Bool {
    switch (posts.get(id)) {
      case null false;
      case (?p) {
        if (not Principal.equal(p.creator, caller)) return false;
        posts.remove(id);
        true;
      };
    };
  };

  public shared ({ caller }) func likePost(postId : Text) : async () {
    let current = postLikes.get(postId).get([]);
    if (not hasPrincipal(current, caller)) {
      postLikes.add(postId, current.concat([caller]));
      switch (posts.get(postId)) {
        case (?p) { createNotif(p.creator, caller, "post_like", ?postId) };
        case null {};
      };
    };
  };

  public shared ({ caller }) func unlikePost(postId : Text) : async () {
    postLikes.add(postId, removePrincipal(postLikes.get(postId).get([]), caller));
  };

  public query func getPostLikeCount(postId : Text) : async Nat = async postLikes.get(postId).get([]).size();

  public shared query ({ caller }) func didCallerLikePost(postId : Text) : async Bool =
    async hasPrincipal(postLikes.get(postId).get([]), caller);

  public shared ({ caller }) func addPostComment(postId : Text, text : Text) : async Text {
    let id = nextCommentId();
    comments.add(id, { id; videoId = postId; author = caller; text; createdAt = Time.now() });
    switch (posts.get(postId)) {
      case (?p) { createNotif(p.creator, caller, "post_comment", ?postId) };
      case null {};
    };
    id;
  };

  public query func getPostComments(postId : Text) : async [Comment] {
    var arr : [Comment] = [];
    for ((_, c) in comments.entries()) { if (c.videoId == postId) { arr := arr.concat([c]) } };
    arr.sort(compareCommentAsc);
  };

  public query func searchPosts(term : Text) : async [Post] {
    let q = term.toLower();
    var arr : [Post] = [];
    for ((_, p) in posts.entries()) {
      let match = p.caption.toLower().contains(#text q);
      var tagMatch = false;
      for (h in p.hashtags.values()) { if (h.toLower().contains(#text q)) { tagMatch := true } };
      if (match or tagMatch) { arr := arr.concat([p]) };
    };
    arr;
  };

  // ===== SAVE VIDEOS =====
  public shared ({ caller }) func saveVideo(videoId : Text) : async () {
    let key = pkey(caller);
    let current = savedVideos.get(key).get([]);
    if (not hasText(current, videoId)) { savedVideos.add(key, current.concat([videoId])) };
  };

  public shared ({ caller }) func unsaveVideo(videoId : Text) : async () {
    savedVideos.add(pkey(caller), removeText(savedVideos.get(pkey(caller)).get([]), videoId));
  };

  public shared query ({ caller }) func getSavedVideos() : async [Video] {
    let ids = savedVideos.get(pkey(caller)).get([]);
    var arr : [Video] = [];
    for (id in ids.values()) { switch (videos.get(id)) { case (?v) { arr := arr.concat([v]) }; case null {} } };
    arr;
  };

  public shared query ({ caller }) func isVideoSaved(videoId : Text) : async Bool =
    async hasText(savedVideos.get(pkey(caller)).get([]), videoId);

  public shared query ({ caller }) func getLikedVideos() : async [Video] {
    var arr : [Video] = [];
    for ((videoId, likerList) in likes.entries()) {
      if (hasPrincipal(likerList, caller)) {
        switch (videos.get(videoId)) { case (?v) { arr := arr.concat([v]) }; case null {} };
      };
    };
    arr.sort(compareVideoDesc);
  };

  public shared ({ caller }) func hideVideo(videoId : Text) : async () {
    let current = hiddenVideos.get(pkey(caller)).get([]);
    if (not hasText(current, videoId)) { hiddenVideos.add(pkey(caller), current.concat([videoId])) };
  };

  public shared ({ caller }) func unhideVideo(videoId : Text) : async () {
    hiddenVideos.add(pkey(caller), removeText(hiddenVideos.get(pkey(caller)).get([]), videoId));
  };

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
    switch (pinnedVideos.get(pkey(p))) { case null null; case (?id) videos.get(id) };
  };

  public shared ({ caller }) func reportVideo(videoId : Text, reason : Text) : async () {
    let id = nextReportId();
    reports.add(id, { id; videoId; reporter = caller; reason; createdAt = Time.now() });
  };

  // ===== LIKES (Video) =====
  public shared ({ caller }) func likeVideo(videoId : Text) : async () {
    let current = likes.get(videoId).get([]);
    if (not hasPrincipal(current, caller)) {
      likes.add(videoId, current.concat([caller]));
      switch (videos.get(videoId)) { case (?v) { createNotif(v.creator, caller, "like", ?videoId) }; case null {} };
    };
  };

  public shared ({ caller }) func unlikeVideo(videoId : Text) : async () {
    likes.add(videoId, removePrincipal(likes.get(videoId).get([]), caller));
  };

  public query func getLikeCount(videoId : Text) : async Nat = async likes.get(videoId).get([]).size();

  public shared query ({ caller }) func didCallerLike(videoId : Text) : async Bool =
    async hasPrincipal(likes.get(videoId).get([]), caller);

  // ===== COMMENTS =====
  public shared ({ caller }) func addComment(videoId : Text, text : Text) : async Text {
    let id = nextCommentId();
    comments.add(id, { id; videoId; author = caller; text; createdAt = Time.now() });
    switch (videos.get(videoId)) { case (?v) { createNotif(v.creator, caller, "comment", ?videoId) }; case null {} };
    id;
  };

  public query func getComments(videoId : Text) : async [Comment] {
    var arr : [Comment] = [];
    for ((_, c) in comments.entries()) { if (c.videoId == videoId) { arr := arr.concat([c]) } };
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
      for (h in v.hashtags.values()) { if (h.toLower().contains(#text q)) { tagMatch := true } };
      if (match or tagMatch) { arr := arr.concat([v]) };
    };
    arr;
  };

  public query func searchUsers(term : Text) : async [UserProfile] {
    let q = term.toLower();
    var arr : [UserProfile] = [];
    for ((_, u) in users.entries()) { if (u.username.toLower().contains(#text q)) { arr := arr.concat([u]) } };
    arr;
  };

  // ===== NOTIFICATIONS =====
  public shared query ({ caller }) func getNotifications() : async [Notification] {
    var arr : [Notification] = [];
    for ((_, n) in notifications.entries()) { if (Principal.equal(n.recipient, caller)) { arr := arr.concat([n]) } };
    arr.sort(compareNotifDesc);
  };

  public shared ({ caller }) func markNotificationsRead() : async () {
    for ((id, n) in notifications.entries()) {
      if (Principal.equal(n.recipient, caller) and not n.read) {
        notifications.add(id, { id = n.id; recipient = n.recipient; sender = n.sender; notifType = n.notifType; videoId = n.videoId; read = true; createdAt = n.createdAt });
      };
    };
  };

  // ===== STORIES =====
  let twentyFourHours : Int = 86_400_000_000_000;

  public shared ({ caller }) func createStory(mediaKey : Text, mediaType : Text, caption : Text) : async Text {
    let id = nextStoryId();
    let now = Time.now();
    stories.add(id, { id; creator = caller; mediaKey; mediaType; caption; createdAt = now; expiresAt = now + twentyFourHours });
    id;
  };

  public query func getActiveStories() : async [Story] {
    let now = Time.now();
    var arr : [Story] = [];
    for ((_, s) in stories.entries()) { if (s.expiresAt > now) { arr := arr.concat([s]) } };
    arr.sort(compareStoryDesc);
  };

  public query func getStoriesByUser(p : Principal) : async [Story] {
    let now = Time.now();
    var arr : [Story] = [];
    for ((_, s) in stories.entries()) { if (Principal.equal(s.creator, p) and s.expiresAt > now) { arr := arr.concat([s]) } };
    arr.sort(compareStoryDesc);
  };

  public shared ({ caller }) func deleteStory(id : Text) : async Bool {
    switch (stories.get(id)) {
      case null false;
      case (?s) {
        if (not Principal.equal(s.creator, caller)) return false;
        stories.remove(id);
        true;
      };
    };
  };

  public shared ({ caller }) func viewStory(id : Text) : async () {
    let current = storyViews.get(pkey(caller)).get([]);
    if (not hasText(current, id)) { storyViews.add(pkey(caller), current.concat([id])) };
  };

  public shared query ({ caller }) func getViewedStoryIds() : async [Text] =
    async storyViews.get(pkey(caller)).get([]);

  public shared query ({ caller }) func hasUnviewedStories(p : Principal) : async Bool {
    let now = Time.now();
    let viewed = storyViews.get(pkey(caller)).get([]);
    var found = false;
    for ((_, s) in stories.entries()) {
      if (Principal.equal(s.creator, p) and s.expiresAt > now and not hasText(viewed, s.id)) { found := true };
    };
    found;
  };

  // ===== STORY REACTIONS =====
  public shared ({ caller }) func addStoryReaction(storyId : Text, emoji : Text) : async () {
    // Remove existing reaction from this user for this story
    for ((rId, r) in storyReactions.entries()) {
      if (r.storyId == storyId and Principal.equal(r.user, caller)) {
        storyReactions.remove(rId);
      };
    };
    let id = nextStoryReactionId();
    storyReactions.add(id, { id; storyId; user = caller; emoji; createdAt = Time.now() });
    switch (stories.get(storyId)) {
      case (?s) { createNotif(s.creator, caller, "story_reaction", null) };
      case null {};
    };
  };

  public shared ({ caller }) func removeStoryReaction(storyId : Text) : async () {
    for ((rId, r) in storyReactions.entries()) {
      if (r.storyId == storyId and Principal.equal(r.user, caller)) {
        storyReactions.remove(rId);
      };
    };
  };

  public query func getStoryReactions(storyId : Text) : async [StoryReaction] {
    var arr : [StoryReaction] = [];
    for ((_, r) in storyReactions.entries()) { if (r.storyId == storyId) { arr := arr.concat([r]) } };
    arr;
  };

  public shared query ({ caller }) func getMyStoryReaction(storyId : Text) : async ?StoryReaction {
    for ((_, r) in storyReactions.entries()) {
      if (r.storyId == storyId and Principal.equal(r.user, caller)) { return ?r };
    };
    null;
  };

  // ===== TINDER SWIPE =====
  public shared ({ caller }) func swipeRight(target : Principal) : async Bool {
    let callerKey = pkey(caller);
    let targetKey = pkey(target);
    let current = swipedRight.get(callerKey).get([]);
    if (not hasText(current, targetKey)) {
      swipedRight.add(callerKey, current.concat([targetKey]));
    };
    let targetSwipes = swipedRight.get(targetKey).get([]);
    if (hasText(targetSwipes, callerKey)) {
      let matchId = nextMatchId();
      matches.add(matchId, { id = matchId; user1 = caller; user2 = target; createdAt = Time.now() });
      createNotif(target, caller, "match", null);
      createNotif(caller, target, "match", null);
      return true;
    };
    false;
  };

  public shared ({ caller }) func swipeLeft(target : Principal) : async () {
    let callerKey = pkey(caller);
    let targetKey = pkey(target);
    let current = swipedLeft.get(callerKey).get([]);
    if (not hasText(current, targetKey)) {
      swipedLeft.add(callerKey, current.concat([targetKey]));
    };
  };

  public shared query ({ caller }) func getMatches() : async [Match] {
    var arr : [Match] = [];
    for ((_, m) in matches.entries()) {
      if (Principal.equal(m.user1, caller) or Principal.equal(m.user2, caller)) {
        arr := arr.concat([m]);
      };
    };
    arr;
  };

  public shared query ({ caller }) func getPotentialMatches() : async [UserProfile] {
    let callerKey = pkey(caller);
    let alreadyRight = swipedRight.get(callerKey).get([]);
    let alreadyLeft = swipedLeft.get(callerKey).get([]);
    var arr : [UserProfile] = [];
    for ((key, u) in users.entries()) {
      if (not Principal.equal(u.principal, caller)
        and not hasText(alreadyRight, key)
        and not hasText(alreadyLeft, key)) {
        arr := arr.concat([u]);
      };
    };
    arr;
  };

  public shared query ({ caller }) func isMatch(other : Principal) : async Bool {
    for ((_, m) in matches.entries()) {
      if ((Principal.equal(m.user1, caller) and Principal.equal(m.user2, other))
        or (Principal.equal(m.user1, other) and Principal.equal(m.user2, caller))) {
        return true;
      };
    };
    false;
  };

  // ===== MUTUAL FOLLOWS =====
  public shared query ({ caller }) func getMutualFollowCount(other : Principal) : async Nat {
    let callerFollowing = following.get(pkey(caller)).get([]);
    let otherFollowing = following.get(pkey(other)).get([]);
    var count = 0;
    for (p in callerFollowing.values()) {
      if (hasPrincipal(otherFollowing, p)) { count += 1 };
    };
    count;
  };

  public shared query ({ caller }) func getMutualFollowProfiles(other : Principal) : async [UserProfile] {
    let callerFollowing = following.get(pkey(caller)).get([]);
    let otherFollowing = following.get(pkey(other)).get([]);
    var result : [UserProfile] = [];
    for (p in callerFollowing.values()) {
      if (hasPrincipal(otherFollowing, p) and result.size() < 5) {
        switch (users.get(pkey(p))) {
          case (?u) { result := result.concat([u]) };
          case null {};
        };
      };
    };
    result;
  };

  public shared query ({ caller }) func getCandidateDetails(target : Principal) : async { followerCount : Nat; followingCount : Nat; videoCount : Nat; postCount : Nat; mutualCount : Nat } {
    let targetKey = pkey(target);
    var followerCount = 0;
    var videoCount = 0;
    var postCount = 0;
    for ((_, list) in following.entries()) { if (hasPrincipal(list, target)) { followerCount += 1 } };
    for ((_, v) in videos.entries()) { if (Principal.equal(v.creator, target)) { videoCount += 1 } };
    for ((_, p) in posts.entries()) { if (Principal.equal(p.creator, target)) { postCount += 1 } };
    let callerFollowing = following.get(pkey(caller)).get([]);
    let targetFollowing = following.get(targetKey).get([]);
    var mutualCount = 0;
    for (p in callerFollowing.values()) {
      if (hasPrincipal(targetFollowing, p)) { mutualCount += 1 };
    };
    {
      followerCount;
      followingCount = targetFollowing.size();
      videoCount;
      postCount;
      mutualCount;
    };
  };

  // ===== DIRECT MESSAGES =====
  public shared ({ caller }) func sendMessage(recipient : Principal, text : Text) : async Bool {
    var matched = false;
    for ((_, m) in matches.entries()) {
      if ((Principal.equal(m.user1, caller) and Principal.equal(m.user2, recipient))
        or (Principal.equal(m.user1, recipient) and Principal.equal(m.user2, caller))) {
        matched := true;
      };
    };
    if (not matched) return false;
    let id = nextMessageId();
    let convId = conversationId(caller, recipient);
    messages.add(id, { id; conversationId = convId; sender = caller; text; createdAt = Time.now() });
    true;
  };

  public shared query ({ caller }) func getMessages(other : Principal) : async [Message] {
    let convId = conversationId(caller, other);
    var arr : [Message] = [];
    for ((_, msg) in messages.entries()) { if (msg.conversationId == convId) { arr := arr.concat([msg]) } };
    arr.sort(compareMessageAsc);
  };

  public shared query ({ caller }) func getConversations() : async [{ otherPrincipal : Principal; lastMessageText : Text; lastMessageAt : Int }] {
    var matchedUsers : [Principal] = [];
    for ((_, m) in matches.entries()) {
      if (Principal.equal(m.user1, caller)) { matchedUsers := matchedUsers.concat([m.user2]) }
      else if (Principal.equal(m.user2, caller)) { matchedUsers := matchedUsers.concat([m.user1]) };
    };
    var result : [{ otherPrincipal : Principal; lastMessageText : Text; lastMessageAt : Int }] = [];
    for (other in matchedUsers.values()) {
      let convId = conversationId(caller, other);
      var last : ?Message = null;
      for ((_, msg) in messages.entries()) {
        if (msg.conversationId == convId) {
          switch (last) {
            case null { last := ?msg };
            case (?l) { if (msg.createdAt > l.createdAt) { last := ?msg } };
          };
        };
      };
      let (lastText, lastAt) = switch (last) {
        case null ("No messages yet", 0);
        case (?msg) (msg.text, msg.createdAt);
      };
      result := result.concat([{ otherPrincipal = other; lastMessageText = lastText; lastMessageAt = lastAt }]);
    };
    result;
  };

  // ===== DUETS =====
  public shared ({ caller }) func createDuet(originalVideoId : Text, videoKey : Text, thumbnailKey : Text, caption : Text) : async Text {
    let id = nextDuetId();
    duets.add(id, { id; originalVideoId; creator = caller; videoKey; thumbnailKey; caption; createdAt = Time.now() });
    switch (videos.get(originalVideoId)) {
      case (?v) { createNotif(v.creator, caller, "duet", ?originalVideoId) };
      case null {};
    };
    id;
  };

  public query func getDuetsByVideo(videoId : Text) : async [Duet] {
    var arr : [Duet] = [];
    for ((_, d) in duets.entries()) { if (d.originalVideoId == videoId) { arr := arr.concat([d]) } };
    arr.sort(compareDuetDesc);
  };

  public query func getUserDuets(p : Principal) : async [Duet] {
    var arr : [Duet] = [];
    for ((_, d) in duets.entries()) { if (Principal.equal(d.creator, p)) { arr := arr.concat([d]) } };
    arr.sort(compareDuetDesc);
  };

  public shared ({ caller }) func deleteDuet(id : Text) : async Bool {
    switch (duets.get(id)) {
      case null false;
      case (?d) {
        if (not Principal.equal(d.creator, caller)) return false;
        duets.remove(id);
        true;
      };
    };
  };

  // ===== STORY COMMENTS =====
  public shared ({ caller }) func addStoryComment(storyId : Text, text : Text) : async Text {
    let id = nextStoryCommentId();
    storyComments.add(id, { id; storyId; author = caller; text; createdAt = Time.now() });
    switch (stories.get(storyId)) {
      case (?s) { createNotif(s.creator, caller, "story_comment", null) };
      case null {};
    };
    id;
  };

  public query func getStoryComments(storyId : Text) : async [StoryComment] {
    var arr : [StoryComment] = [];
    for ((_, c) in storyComments.entries()) { if (c.storyId == storyId) { arr := arr.concat([c]) } };
    arr.sort(func(a : StoryComment, b : StoryComment) : Order.Order = Int.compare(a.createdAt, b.createdAt));
  };

  public shared ({ caller }) func deleteStoryComment(commentId : Text) : async Bool {
    switch (storyComments.get(commentId)) {
      case null false;
      case (?c) {
        if (not Principal.equal(c.author, caller)) return false;
        storyComments.remove(commentId);
        true;
      };
    };
  };
};
