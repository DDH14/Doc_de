// const CARDS = [
// Cấp nền tảng – tần suất cao
window.CARDS =[
  { id:"w_0001", text:"bé", tags:["basic"] },
  { id:"w_0002", text:"mẹ", tags:["basic"] },
  { id:"w_0003", text:"bà", tags:["basic","tone"] },
  { id:"w_0004", text:"bố", tags:["basic","tone"] },
  { id:"w_0005", text:"ông", tags:["basic","tone"] },
  { id:"w_0006", text:"cô", tags:["basic","tone"] },
  { id:"w_0007", text:"chú", tags:["basic","tone"] },
  { id:"w_0008", text:"nhà", tags:["basic"] },
  { id:"w_0009", text:"cửa", tags:["basic","tone"] },
  { id:"w_0010", text:"bàn", tags:["basic","tone"] },
  { id:"w_0011", text:"ghế", tags:["basic","tone","ghg"] },
  { id:"w_0012", text:"cây", tags:["basic","tone"] },
  { id:"w_0013", text:"lá", tags:["basic","tone"] },
  { id:"w_0014", text:"hoa", tags:["basic"] },
  { id:"w_0015", text:"quả", tags:["tone","ckqu"] },
  // Con vật – đồ vật quen thuộc
  { id:"w_0016", text:"cá", tags:["basic","tone"] },
  { id:"w_0017", text:"gà", tags:["basic","tone"] },
  { id:"w_0018", text:"chó", tags:["chtr","tone"] },
  { id:"w_0019", text:"mèo", tags:["basic","tone"] },
  { id:"w_0020", text:"chim", tags:["basic"] },
  { id:"w_0021", text:"trứng", tags:["chtr","tone"] },
  { id:"w_0022", text:"sách", tags:["sx","tone"] },
  { id:"w_0023", text:"bút", tags:["basic"] },
  { id:"w_0024", text:"vở", tags:["tone"] },
  { id:"w_0025", text:"thước", tags:["tone"] },
  // Thiên nhiên – thời tiết
  { id:"w_0026", text:"trăng", tags:["chtr"] },
  { id:"w_0027", text:"sao", tags:["basic"] },
  { id:"w_0028", text:"mưa", tags:["tone"] },
  { id:"w_0029", text:"nắng", tags:["tone"] },
  { id:"w_0030", text:"mây", tags:["tone"] },
  { id:"w_0031", text:"gió", tags:["tone"] },
  { id:"w_0032", text:"sông", tags:["sx"] },
  { id:"w_0033", text:"xương", tags:["sx"] },
  { id:"w_0034", text:"biển", tags:["tone"] },
  { id:"w_0035", text:"núi", tags:["tone"] },
  { id:"w_0036", text:"đường", tags:["tone"] },
  // Hoạt động hằng ngày
  { id:"w_0037", text:"đi", tags:["basic"] },
  { id:"w_0038", text:"về", tags:["tone"] },
  { id:"w_0039", text:"học", tags:["basic"] },
  { id:"w_0040", text:"đọc", tags:["basic"] },
  { id:"w_0041", text:"viết", tags:["tone"] },
  { id:"w_0042", text:"chơi", tags:["tone"] },
  { id:"w_0043", text:"chạy", tags:["tone"] },
  { id:"w_0044", text:"nhảy", tags:["tone"] },
  { id:"w_0045", text:"ăn", tags:["tone"] },
  { id:"w_0046", text:"uống", tags:["tone"] },
  { id:"w_0047", text:"ngủ", tags:["tone"] },
  { id:"w_0048", text:"thức", tags:["tone"] },
  // Cụm dễ nhầm quy tắc chính tả
  { id:"w_0049", text:"chanh", tags:["chtr"] },
  { id:"w_0050", text:"tranh", tags:["chtr"] },
  { id:"w_0051", text:"sương", tags:["sx"] },
  { id:"w_0052", text:"xưa", tags:["sx","tone"] },
  { id:"w_0053", text:"quà", tags:["ckqu","tone"] },
  { id:"w_0054", text:"quê", tags:["ckqu","tone"] },
  { id:"w_0055", text:"kẹo", tags:["ckqu","tone"] },
  { id:"w_0056", text:"cối", tags:["tone"] },
  { id:"w_0057", text:"nghỉ", tags:["ngngh","tone"] },
  { id:"w_0058", text:"nghệ", tags:["ngngh","tone"] },
  { id:"w_0059", text:"nồi", tags:["nl","tone"] },
  { id:"w_0060", text:"lồi", tags:["nl","tone"] },
  { id:"w_0061", text:"trâu", tags:["chtr","tone"] },
  { id:"w_0062", text:"châu", tags:["chtr","tone"] },
  { id:"w_0063", text:"giấy", tags:["tone"] },
  { id:"w_0064", text:"khỏe", tags:["tone"] },
  { id:"w_0065", text:"bữa", tags:["tone"] },

  // Bổ sung (giữ nguyên cấu trúc)
  { id:"w_0066", text:"sữa", tags:["tone"] },
  { id:"w_0067", text:"lúa", tags:["tone"] },
  { id:"w_0068", text:"quạt", tags:["ckqu","tone"] },
  { id:"w_0069", text:"quên", tags:["ckqu","tone"] },
  { id:"w_0070", text:"ghé", tags:["ghg","tone"] },
  { id:"w_0071", text:"ghen", tags:["ghg","tone"] },
  { id:"w_0072", text:"giỏ", tags:["tone"] },
  { id:"w_0073", text:"sáo", tags:["sx","tone"] },
  { id:"w_0074", text:"xáo", tags:["sx","tone"] },
  { id:"w_0075", text:"sẻ", tags:["sx","tone"] },
  { id:"w_0076", text:"xẻ", tags:["sx","tone"] },
  { id:"w_0077", text:"trẻ", tags:["chtr","tone"] },
  { id:"w_0078", text:"chẻ", tags:["chtr","tone"] },
  { id:"w_0079", text:"nâu", tags:["nl","tone"] },
  { id:"w_0080", text:"lâu", tags:["nl","tone"] },
  { id:"w_0081", text:"nặng", tags:["nl","tone"] },
  { id:"w_0082", text:"lặng", tags:["nl","tone"] },
  { id:"w_0083", text:"trời", tags:["chtr","tone"] },
  { id:"w_0084", text:"trôi", tags:["chtr","tone"] },
  { id:"w_0085", text:"quý", tags:["ckqu","tone"] }
];

window.PA_ITEMS = [
  // Ghép âm/tiếng (onset–rime, cụm phụ âm)
  { type:"segment", target:"tranh", parts:["tr","anh"], speak:"tranh", tags:["chtr"] },
  { type:"segment", target:"sách", parts:["s","ách"], speak:"sách", tags:["sx","tone"] },
  { type:"segment", target:"cháo", parts:["ch","áo"], speak:"cháo", tags:["chtr","tone"] },
  { type:"segment", target:"xanh", parts:["x","anh"], speak:"xanh", tags:["sx"] },
  { type:"segment", target:"trường", parts:["tr","ường"], speak:"trường", tags:["chtr"] },
  { type:"segment", target:"nghỉ", parts:["ngh","ỉ"], speak:"nghỉ", tags:["ngngh","tone"] },
  { type:"segment", target:"ghế", parts:["gh","ế"], speak:"ghế", tags:["ghg","tone"] },
  { type:"segment", target:"quả", parts:["qu","ả"], speak:"quả", tags:["ckqu","tone"] },
  { type:"segment", target:"thuốc", parts:["thu","ốc"], speak:"thuốc", tags:["tone"] },
  { type:"segment", target:"viết", parts:["vi","ết"], speak:"viết", tags:["tone"] },
  { type:"segment", target:"bắp", parts:["b","ắp"], speak:"bắp", tags:["tone"] },
  { type:"segment", target:"chạy", parts:["ch","ạy"], speak:"chạy", tags:["tone"] },
  { type:"segment", target:"sữa", parts:["s","ữa"], speak:"sữa", tags:["tone"] },
  { type:"segment", target:"cầu", parts:["c","ầu"], speak:"cầu", tags:["tone"] },
  { type:"segment", target:"giấy", parts:["gi","ấy"], speak:"giấy", tags:["tone"] },
  { type:"segment", target:"người", parts:["ng","ười"], speak:"người", tags:[] },
  { type:"segment", target:"trẻ", parts:["tr","ẻ"], speak:"trẻ", tags:["chtr","tone"] },
  { type:"segment", target:"khỏe", parts:["kh","ỏe"], speak:"khỏe", tags:["tone"] },
  { type:"segment", target:"bánh", parts:["b","ánh"], speak:"bánh", tags:["tone"] },
  { type:"segment", target:"ngỗng", parts:["ng","ỗng"], speak:"ngỗng", tags:["tone"] },

  // Bổ sung segment
  { type:"segment", target:"quạt", parts:["qu","ạt"], speak:"quạt", tags:["ckqu","tone"] },
  { type:"segment", target:"ghé", parts:["gh","é"], speak:"ghé", tags:["ghg","tone"] },
  { type:"segment", target:"xẻ", parts:["x","ẻ"], speak:"xẻ", tags:["sx","tone"] },
  { type:"segment", target:"sáo", parts:["s","áo"], speak:"sáo", tags:["sx","tone"] },
  { type:"segment", target:"trôi", parts:["tr","ôi"], speak:"trôi", tags:["chtr","tone"] },

  // Thanh điệu (6 thanh) – chọn đúng
  { type:"tone", base:"me", options:["me","mé","mè","mẻ","mẽ","mẹ"], correct:"mẹ", tags:["tone"] },
  { type:"tone", base:"ga", options:["ga","gá","gà","gả","gã","gạ"], correct:"gà", tags:["tone"] },
  { type:"tone", base:"cho", options:["cho","chó","chò","chỏ","chõ","chọ"], correct:"chó", tags:["tone","chtr"] },
  { type:"tone", base:"la", options:["la","lá","là","lả","lã","lạ"], correct:"lá", tags:["tone"] },
  { type:"tone", base:"ca", options:["ca","cá","cà","cả","cã","cạ"], correct:"cá", tags:["tone"] },
  { type:"tone", base:"gio", options:["gio","gió","gò","gỏ","gõ","gọ"], correct:"gió", tags:["tone"] },
  { type:"tone", base:"lua", options:["lua","lúa","lùa","lủa","lũa","lụa"], correct:"lúa", tags:["tone"] },
  { type:"tone", base:"dua", options:["dua","dúa","dùa","dủa","dũa","dứa"], correct:"dứa", tags:["tone"] },
  { type:"tone", base:"que", options:["que","qué","què","quẻ","quẽ","què"], correct:"quê", tags:["tone","ckqu"] },
  { type:"tone", base:"na", options:["na","ná","nà","nả","nã","nạ"], correct:"ná", tags:["tone"] },

  // Bổ sung tone
  { type:"tone", base:"bo", options:["bo","bó","bò","bỏ","bõ","bọ"], correct:"bò", tags:["tone"] },
  { type:"tone", base:"mo", options:["mo","mó","mò","mỏ","mõ","mọ"], correct:"mỏ", tags:["tone"] },
  { type:"tone", base:"tre", options:["tre","tré","trè","trẻ","trẽ","trẹ"], correct:"trẻ", tags:["tone","chtr"] },
  { type:"tone", base:"sua", options:["sua","súa","sùa","sủa","sũa","sụa"], correct:"sủa", tags:["tone"] },

  // Cặp tối thiểu (nghe – chọn)
  { type:"pair", pair:["sương","xương"], correctIndex:0, focus:"sx" },
  { type:"pair", pair:["sấu","xấu"], correctIndex:1, focus:"sx" },
  { type:"pair", pair:["sôi","xôi"], correctIndex:1, focus:"sx" },
  { type:"pair", pair:["trâu","châu"], correctIndex:0, focus:"chtr" },
  { type:"pair", pair:["chanh","tranh"], correctIndex:1, focus:"chtr" },
  { type:"pair", pair:["chai","trai"], correctIndex:1, focus:"chtr" },
  { type:"pair", pair:["nồi","lồi"], correctIndex:0, focus:"nl" },
  { type:"pair", pair:["nặng","lặng"], correctIndex:0, focus:"nl" },

  // Bổ sung pair
  { type:"pair", pair:["sáo","xáo"], correctIndex:0, focus:"sx" },
  { type:"pair", pair:["sẻ","xẻ"], correctIndex:1, focus:"sx" },
  { type:"pair", pair:["trẻ","chẻ"], correctIndex:0, focus:"chtr" },
  { type:"pair", pair:["chung","trung"], correctIndex:1, focus:"chtr" },
  { type:"pair", pair:["nâu","lâu"], correctIndex:0, focus:"nl" }
];

window.PASSAGES = [
  // Level 1 — câu ngắn, từ tần suất cao
  {
    id:"p_001", level:1,
    text:"Bé ăn cá. Mẹ mua rau. Chó chạy nhanh.",
    questions:[
      { q:"Ai ăn cá?", choices:["Bé","Mẹ","Chó"], ans:0, type:"literal" },
      { q:"Ai chạy nhanh?", choices:["Cá","Chó","Mẹ"], ans:1, type:"literal" }
    ]
  },
  {
    id:"p_004", level:1,
    text:"Bé Na tưới cây. Lá ướt. Na cười vui.",
    questions:[
      { q:"Na làm gì?", choices:["Tưới cây","Quét nhà","Cho cá ăn"], ans:0, type:"literal" },
      { q:"Vì sao lá ướt?", choices:["Vì tưới nước","Vì gió","Vì nắng"], ans:0, type:"inferential" }
    ]
  },
  {
    id:"p_005", level:1,
    text:"Bố bế bé. Mẹ phơi áo. Chó nằm ngủ.",
    questions:[
      { q:"Ai phơi áo?", choices:["Bố","Mẹ","Bé"], ans:1, type:"literal" },
      { q:"Chó làm gì?", choices:["Ngủ","Ăn","Chạy"], ans:0, type:"literal" }
    ]
  },

  // Level 2 — 2–3 câu, mở rộng hành động – nguyên nhân
  {
    id:"p_002", level:2,
    text:"Buổi sáng, Lan tưới cây trước sân. Cây nhỏ có lá xanh. Mẹ bảo Lan tưới nhẹ để đất không trôi.",
    questions:[
      { q:"Lan làm gì buổi sáng?", choices:["Tưới cây","Quét nhà","Cho mèo ăn"], ans:0, type:"literal" },
      { q:"Vì sao tưới nhẹ?", choices:["Để đất không trôi","Vì trời mưa","Vì cây lớn"], ans:0, type:"inferential" }
    ]
  },
  {
    id:"p_006", level:2,
    text:"Chiều nay, Minh cùng mẹ ra chợ. Minh chọn bó rau tươi và ít cà chua. Trời nắng nhẹ nên hai mẹ con đi chậm để đỡ mệt.",
    questions:[
      { q:"Minh đi đâu?", choices:["Ra chợ","Ra bờ sông","Đến trường"], ans:0, type:"literal" },
      { q:"Vì sao hai mẹ con đi chậm?", choices:["Vì trời nắng","Vì mưa","Vì đói"], ans:0, type:"inferential" }
    ]
  },
  {
    id:"p_007", level:2,
    text:"Ở lớp, cô giao việc tưới vườn cây. Mỗi bạn cầm một bình nhỏ. Bạn nào tưới xong sẽ xếp bình ngay ngắn vào kệ.",
    questions:[
      { q:"Cô giao việc gì?", choices:["Tưới vườn cây","Quét lớp","Lau bảng"], ans:0, type:"literal" },
      { q:"Bình được đặt ở đâu sau khi tưới?", choices:["Ở kệ","Ngoài sân","Trên bàn"], ans:0, type:"literal" }
    ]
  },

  // Level 3 — 4–5 câu, thêm trình tự – mục tiêu
  {
    id:"p_003", level:3,
    text:"Hôm nay lớp Lan trồng rau ở vườn trường. Mỗi bạn chăm một luống. Lan nhổ cỏ, bạn Nam tưới nước. Các em học cách đo khoảng cách để gieo hạt đều. Cuối buổi, thầy khen cả lớp làm tốt.",
    questions:[
      { q:"Bạn Nam làm gì?", choices:["Tưới nước","Nhổ cỏ","Gieo hạt"], ans:0, type:"literal" },
      { q:"Vì sao phải đo khoảng cách?", choices:["Để gieo đều","Cho nhanh","Vì thầy bảo"], ans:0, type:"inferential" },
      { q:"Cuối buổi thầy nói gì?", choices:["Khen cả lớp","Nhắc về nhà","Cho nghỉ sớm"], ans:0, type:"literal" }
    ]
  },
  {
    id:"p_008", level:3,
    text:"Sáng chủ nhật, bố dẫn Minh đi công viên. Hai bố con tập đi xe đạp quanh hồ. Minh tập giữ thăng bằng và nhìn thẳng phía trước. Ngã một lần, Minh vẫn đứng dậy tập tiếp.",
    questions:[
      { q:"Minh đi đâu với bố?", choices:["Công viên","Siêu thị","Sân trường"], ans:0, type:"literal" },
      { q:"Minh học được điều gì khi đi xe?", choices:["Giữ thăng bằng","Đi thật nhanh","Không cần đội mũ"], ans:0, type:"inferential" },
      { q:"Minh có bỏ cuộc không?", choices:["Không","Có","Không rõ"], ans:0, type:"literal" }
    ]
  },
  {
    id:"p_009", level:3,
    text:"Trong giờ thủ công, cả nhóm làm diều giấy. Bạn cắt, bạn dán, bạn buộc dây. Gió lên, chiếc diều nhỏ bay cao. Các bạn reo vui vì thành quả của mình.",
    questions:[
      { q:"Cả nhóm làm gì?", choices:["Làm diều","Nấu ăn","Trồng hoa"], ans:0, type:"literal" },
      { q:"Điều gì xảy ra khi gió lên?", choices:["Diều bay cao","Diều rơi xuống","Không đổi"], ans:0, type:"literal" },
      { q:"Vì sao các bạn vui?", choices:["Vì thành quả","Vì được nghỉ","Vì trời mưa"], ans:0, type:"inferential" }
    ]
  },

  // Level 4 — 80–120 từ, thêm nguyên nhân – kết quả – suy luận
  {
    id:"p_010", level:4,
    text:"Buổi chiều, lớp 3A tổ chức phiên chợ xanh ở sân trường. Bạn Lan bày rổ rau do lớp tự trồng, có rau muống, cải xanh và ít rau thơm. Bạn Nam phụ cân rau và ghi giá. Mỗi người chỉ mang theo túi vải để đựng, không dùng túi nilon. Hết giờ, các bạn dọn sạch sân, gom rác vào đúng nơi. Cô giáo khen lớp biết giữ môi trường và biết chia việc cho nhau.",
    questions:[
      { q:"Phiên chợ bán gì?", choices:["Rau tự trồng","Đồ chơi","Sách cũ"], ans:0, type:"literal" },
      { q:"Vì sao mọi người dùng túi vải?", choices:["Để giảm rác","Để đẹp hơn","Vì rẻ"], ans:0, type:"inferential" },
      { q:"Ai phụ cân rau?", choices:["Bạn Nam","Bạn Lan","Cô giáo"], ans:0, type:"literal" },
      { q:"Cuối buổi lớp làm gì?", choices:["Dọn sạch sân","Về ngay","Mua bánh"], ans:0, type:"literal" }
    ]
  },
  {
    id:"p_011", level:4,
    text:"Tổ của Mai làm dự án quan sát thời tiết một tuần. Mỗi ngày, các bạn ghi nhiệt độ, lượng mưa và hướng gió. Cuối tuần, cả tổ vẽ biểu đồ đơn giản để so sánh. Mai nhận ra hai ngày mưa thì nhiệt độ thấp hơn. Cô gợi ý tổ suy nghĩ thêm: ngoài mưa, còn yếu tố nào có thể làm trời mát?",
    questions:[
      { q:"Tổ của Mai ghi những gì mỗi ngày?", choices:["Nhiệt độ, mưa, gió","Bài tập","Giờ vào lớp"], ans:0, type:"literal" },
      { q:"Mai rút ra điều gì?", choices:["Ngày mưa mát hơn","Ngày nắng mát hơn","Ngày gió nóng hơn"], ans:0, type:"inferential" },
      { q:"Cuối tuần các bạn làm gì?", choices:["Vẽ biểu đồ","Đi dã ngoại","Trồng cây"], ans:0, type:"literal" },
      { q:"Cô gợi ý điều gì?", choices:["Tìm yếu tố khác","Dừng dự án","Thay đổi chủ đề"], ans:0, type:"inferential" }
    ]
  },
  {
    id:"p_012", level:4,
    text:"Câu lạc bộ đọc sách chọn chủ đề động vật. Mỗi bạn giới thiệu một cuốn mình thích và đọc to một đoạn ngắn. Bạn Bình luyện đọc trước ở nhà để không ngắt quãng. Lúc đầu bạn hơi run nhưng sau vài câu thì bình tĩnh hơn. Cả nhóm góp ý cách lên giọng ở câu hỏi và cách ngắt ở dấu phẩy.",
    questions:[
      { q:"Chủ đề buổi đọc là gì?", choices:["Động vật","Cây cối","Nghề nghiệp"], ans:0, type:"literal" },
      { q:"Bình đã chuẩn bị như thế nào?", choices:["Luyện đọc trước","Không chuẩn bị","Nhờ bạn đọc hộ"], ans:0, type:"literal" },
      { q:"Bạn Bình cảm thấy ra sao sau vài câu?", choices:["Bình tĩnh hơn","Run hơn","Như cũ"], ans:0, type:"inferential" },
      { q:"Nhóm góp ý về điều gì?", choices:["Lên giọng, ngắt câu","Viết chính tả","Vẽ tranh"], ans:0, type:"inferential" }
    ]
  },

  // Level 5 — 120–180 từ, nội dung dài hơn, cần suy luận
  {
    id:"p_013", level:5,
    text:"Trước ngày hội khoa học, nhóm của Linh thử nghiệm mô hình lọc nước mini. Các bạn dùng cát, sỏi, than hoạt tính và bông để làm lớp lọc. Nước đục sau khi chảy qua mô hình thì trong hơn, nhưng vẫn còn màu vàng nhạt. Linh đề nghị thử thay đổi thứ tự các lớp và rửa sạch vật liệu trước khi lắp lại. Lần hai, nước trong hơn rõ rệt. Dù vậy, cô giáo nhắc rằng nước này chỉ dùng minh hoạ nguyên lí và không đủ an toàn để uống. Nhóm ghi chép cẩn thận, chuẩn bị bảng trình bày nêu rõ giả thuyết, cách thử và bài học rút ra về hướng đặt tấm pin.",
    questions:[
      { q:"Nhóm dùng gì để làm lớp lọc?", choices:["Cát, sỏi, than, bông","Giấy, gỗ","Đất sét"], ans:0, type:"literal" },
      { q:"Vì sao lần hai nước trong hơn?", choices:["Thay thứ tự và rửa vật liệu","Thêm màu","Đun sôi nước"], ans:0, type:"inferential" },
      { q:"Nước sau lọc có uống được không?", choices:["Không, chỉ minh hoạ","Có thể uống","Tùy thời tiết"], ans:0, type:"inferential" },
      { q:"Nhóm đã làm gì với kết quả?", choices:["Ghi chép, trình bày","Bỏ qua","Không ghi gì"], ans:0, type:"literal" },
      { q:"Bài học rút ra liên quan đến gì?", choices:["Hướng đặt tấm pin","Màu nước","Cỡ ống"], ans:0, type:"inferential" }
    ]
  },
  {
    id:"p_014", level:5,
    text:"Đội bóng rổ của trường tập chiến thuật mới. Huấn luyện viên cho cả đội xem lại video trận trước để nhận ra lúc nào đội bạn phản công nhanh. Sau đó, từng nhóm nhỏ tập kèm người và hỗ trợ bọc lót. Cuối buổi, mọi người cùng tự đánh giá: ai giữ nhịp tốt, ai cần tập thêm động tác bật nhảy. Kế hoạch tuần tới là tăng sức bền và phối hợp khi chuyển trạng thái tấn công – phòng thủ.",
    questions:[
      { q:"Cả đội xem lại gì?", choices:["Video trận trước","Sách chiến thuật","Ảnh đội bạn"], ans:0, type:"literal" },
      { q:"Nội dung tập nhóm nhỏ?", choices:["Kèm người, bọc lót","Chạy đường dài","Tập thể lực nặng"], ans:0, type:"literal" },
      { q:"Hoạt động cuối buổi là gì?", choices:["Tự đánh giá","Thi đấu chính thức","Giải lao dài"], ans:0, type:"literal" },
      { q:"Kế hoạch tuần tới tập trung vào?", choices:["Sức bền, phối hợp","Chiến thuật ném 3 điểm","Thể hình"], ans:0, type:"inferential" },
      { q:"Mục đích xem video?", choices:["Rút kinh nghiệm phản công","Giải trí","Điểm danh"], ans:0, type:"inferential" }
    ]
  },
  {
    id:"p_015", level:5,
    text:"Câu lạc bộ môi trường mở buổi giới thiệu về phân loại rác. Các bạn minh hoạ bằng ba thùng màu: xanh cho rác tái chế, nâu cho rác hữu cơ, xám cho rác còn lại. Một nhóm đóng vai người dân, nhóm khác đóng vai hướng dẫn viên để thực hành tình huống. Cuối giờ, câu hỏi đặt ra là: nếu không chắc một món đồ có tái chế được hay không, nên làm gì để giảm sai sót? Nhiều bạn đề xuất tra cứu nhanh trên điện thoại và dán nhãn hướng dẫn ở góc lớp.",
    questions:[
      { q:"Có mấy thùng rác và màu gì?", choices:["Ba: xanh, nâu, xám","Hai: xanh, đỏ","Một: vàng"], ans:0, type:"literal" },
      { q:"Vai trò được phân chia nhằm mục đích?", choices:["Thực hành tình huống","Trò chơi","Thi vẽ"], ans:0, type:"inferential" },
      { q:"Nếu không chắc tái chế được?", choices:["Tra cứu, dán nhãn","Vứt đại","Để ở nhà"], ans:0, type:"inferential" },
      { q:"Thùng xanh dùng cho?", choices:["Rác tái chế","Rác hữu cơ","Rác còn lại"], ans:0, type:"literal" },
      { q:"Kết quả mong muốn?", choices:["Giảm sai sót","Tiết kiệm điện","Trang trí lớp"], ans:0, type:"inferential" }
    ]
  }
];

// Bổ sung PASSAGES mới (Level 1→5) với số câu theo độ khó
(function addMorePassages(){
  if (!Array.isArray(window.PASSAGES)) window.PASSAGES = [];
  const extra = [
    // Level 1 (2 câu hỏi mỗi đoạn)
    {
      id:"p_029", level:1,
      text:"Bé Minh đẩy cửa. Mẹ gọi Minh ăn cơm. Cả nhà ngồi quanh bàn.",
      questions:[
        { q:"Ai gọi Minh ăn cơm?", choices:["Mẹ","Bố","Bé"], ans:0, type:"literal" },
        { q:"Cả nhà ngồi ở đâu?", choices:["Quanh bàn","Ngoài sân","Trong bếp"], ans:0, type:"inferential" }
      ]
    },
    {
      id:"p_030", level:1,
      text:"Trời nắng nhẹ. Nam đội mũ. Bạn đi chậm để đỡ mệt.",
      questions:[
        { q:"Nam làm gì khi trời nắng?", choices:["Đội mũ","Cởi mũ","Đi chân trần"], ans:0, type:"literal" },
        { q:"Vì sao đi chậm?", choices:["Đỡ mệt","Cho nhanh","Vì mưa"], ans:0, type:"inferential" }
      ]
    },

    // Level 2 (2 câu hỏi mỗi đoạn)
    {
      id:"p_031", level:2,
      text:"Sau cơn mưa, sân còn đọng nước. Mai lấy chổi đẩy nước ra rãnh. Cô khen Mai biết giữ gìn sạch sẽ.",
      questions:[
        { q:"Mai làm gì sau cơn mưa?", choices:["Đẩy nước","Quét lá","Tưới cây"], ans:0, type:"literal" },
        { q:"Cô khen Mai vì điều gì?", choices:["Giữ sạch sẽ","Chạy nhanh","Vẽ đẹp"], ans:0, type:"inferential" }
      ]
    },
    {
      id:"p_032", level:2,
      text:"Anh Tuấn hướng dẫn em ghép hình. Em thử nhiều lần mới thành công. Hai anh em cười rất vui.",
      questions:[
        { q:"Ai hướng dẫn em?", choices:["Anh Tuấn","Bố","Cô"], ans:0, type:"literal" },
        { q:"Em cảm thấy thế nào khi ghép xong?", choices:["Rất vui","Bình thường","Buồn"], ans:0, type:"inferential" }
      ]
    },

    // Level 3 (3 câu hỏi mỗi đoạn)
    {
      id:"p_033", level:3,
      text:"Trong giờ thực hành, nhóm An làm mô hình núi lửa mini bằng đất sét. Mỗi bạn phụ trách một phần: nặn núi, pha dung dịch, trang trí. Khi đổ dung dịch vào, bọt sủi như núi lửa phun. Cả nhóm ghi chép kết quả.",
      questions:[
        { q:"Nhóm làm mô hình gì?", choices:["Núi lửa mini","Cầu giấy","Máy bay giấy"], ans:0, type:"literal" },
        { q:"Khi đổ dung dịch thì sao?", choices:["Bọt sủi mạnh","Không thay đổi","Dung dịch đông lại"], ans:0, type:"inferential" },
        { q:"Nhóm làm gì sau khi thử?", choices:["Ghi chép","Cất đồ ngay","Rời lớp"], ans:0, type:"literal" }
      ]
    },
    {
      id:"p_034", level:3,
      text:"Câu lạc bộ đọc sách mời bạn chia sẻ cuốn yêu thích. Bạn Minh chọn sách về các loài chim. Minh kể vì sao loài cò cần bãi bùn để kiếm ăn. Các bạn đặt câu hỏi và cùng xem hình minh họa.",
      questions:[
        { q:"Minh chọn sách về chủ đề gì?", choices:["Các loài chim","Động vật biển","Cây rừng"], ans:0, type:"literal" },
        { q:"Vì sao cò cần bãi bùn?", choices:["Để kiếm ăn","Để trú mưa","Để ngủ"], ans:0, type:"inferential" },
        { q:"Cả nhóm làm gì sau phần chia sẻ?", choices:["Đặt câu hỏi","Đi về","Chơi trò chơi"], ans:0, type:"literal" }
      ]
    },

    // Level 4 (4 câu hỏi mỗi đoạn)
    {
      id:"p_035", level:4,
      text:"Lớp 4B tổ chức phiên chợ đổi đồ dùng học tập. Bạn nào có bút, thước, sách cũ còn tốt có thể đem đổi. Trước khi đổi, các nhóm kiểm tra tình trạng đồ, dán nhãn rõ ràng. Sau buổi, lớp tổng kết số đồ đã đổi đi và lập bảng thống kê. Cô giáo nhắc mọi người ghi chú lí do đổi để các lớp khác tham khảo.",
      questions:[
        { q:"Phiên chợ đổi gì?", choices:["Đồ dùng học tập","Đồ chơi điện tử","Đồ ăn nhanh"], ans:0, type:"literal" },
        { q:"Trước khi đổi, các nhóm làm gì?", choices:["Kiểm tra, dán nhãn","Đem tặng ngay","Không kiểm tra"], ans:0, type:"literal" },
        { q:"Sau buổi, lớp làm gì?", choices:["Thống kê","Về ngay","Đi dã ngoại"], ans:0, type:"literal" },
        { q:"Cô nhắc việc gì?", choices:["Ghi lí do đổi","Đem thêm túi nilon","Tự ý đổi giá"], ans:0, type:"inferential" }
      ]
    },
    {
      id:"p_036", level:4,
      text:"Tổ Khoa học thử làm pin chanh để thắp sáng đèn LED nhỏ. Các bạn gắn kẽm và đồng vào quả chanh, nối dây vào đèn. Lần đầu đèn không sáng vì nối sai cực. Sửa lại vị trí dây, đèn LED phát sáng yếu. Nhóm rút kinh nghiệm cần nhiều quả chanh và nối tiếp để tăng điện áp.",
      questions:[
        { q:"Nhóm làm gì với chanh?", choices:["Làm pin chanh","Nấu ăn","Tô màu"], ans:0, type:"literal" },
        { q:"Vì sao đèn không sáng lúc đầu?", choices:["Sai cực","Hết pin","Đứt dây"], ans:0, type:"inferential" },
        { q:"Sau khi sửa, đèn thế nào?", choices:["Sáng yếu","Sáng mạnh","Không đổi"], ans:0, type:"literal" },
        { q:"Bài học rút ra là gì?", choices:["Cần nhiều quả, nối tiếp","Không dùng chanh","Dùng pin tiểu"], ans:0, type:"inferential" }
      ]
    },

    // Level 5 (5 câu hỏi mỗi đoạn)
    {
      id:"p_037", level:5,
      text:"Nhóm truyền thông của trường làm bản tin về an toàn khi đi bộ đến lớp. Các bạn khảo sát đoạn đường trước cổng trường, ghi chú chỗ dễ ùn tắc và nơi thiếu vạch qua đường. Sau đó, nhóm phỏng vấn một chú bảo vệ và vài phụ huynh. Bản tin đề xuất đi theo nhóm nhỏ, băng qua đường ở nơi có vạch và đèn. Cuối cùng, nhóm thiết kế poster minh họa đơn giản, dán ở bảng tin để mọi người dễ nhớ.",
      questions:[
        { q:"Chủ đề bản tin là gì?", choices:["An toàn đi bộ đến lớp","Thời tiết cuối tuần","Cuộc thi văn nghệ"], ans:0, type:"literal" },
        { q:"Nhóm khảo sát ở đâu?", choices:["Đoạn trước cổng trường","Trong sân trường","Ở công viên"], ans:0, type:"literal" },
        { q:"Nhóm phỏng vấn ai?", choices:["Bảo vệ và phụ huynh","Học sinh lớp 1","Giáo viên nhạc"], ans:0, type:"literal" },
        { q:"Đề xuất quan trọng là gì?", choices:["Băng qua ở vạch/đèn","Đi thật nhanh","Tránh đi theo nhóm"], ans:0, type:"inferential" },
        { q:"Nhóm làm gì để mọi người dễ nhớ?", choices:["Thiết kế poster","Phát kẹo","Tổ chức trò chơi"], ans:0, type:"inferential" }
      ]
    },
    {
      id:"p_038", level:5,
      text:"Trong dự án khoa học nhỏ, tổ của Huy tìm hiểu vì sao cây ở bệ cửa sổ lớp học kém tươi. Các bạn ghi lại số giờ nắng hằng ngày, lượng nước tưới và nhiệt độ phòng. Sau một tuần, nhóm phát hiện chậu gần cửa mở thường bị gió lùa mạnh làm đất khô nhanh. Nhóm thử che gió bằng tấm mica trong và điều chỉnh lịch tưới. Hai tuần sau, lá non ra đều và màu xanh đậm hơn.",
      questions:[
        { q:"Nhóm của Huy tìm hiểu điều gì?", choices:["Lí do cây kém tươi","Cách trồng hoa hồng","Chọn đất trồng"], ans:0, type:"literal" },
        { q:"Nhóm ghi lại những gì?", choices:["Giờ nắng, lượng tưới, nhiệt độ","Số bạn tưới","Giá chậu cây"], ans:0, type:"literal" },
        { q:"Vì sao đất khô nhanh?", choices:["Gió lùa mạnh","Thiếu đất","Chậu rò rỉ"], ans:0, type:"inferential" },
        { q:"Biện pháp nhóm thử là gì?", choices:["Che gió, chỉnh tưới","Bón nhiều phân","Đổi sang chậu to"], ans:0, type:"literal" },
        { q:"Kết quả sau hai tuần?", choices:["Lá non ra đều, xanh hơn","Cây chết","Không thay đổi"], ans:0, type:"inferential" }
      ]
    }
  ];
  window.PASSAGES.push(...extra);
})();

/* Bổ sung tương thích Cards ver 2: gán 'tag' (đơn) cho từng card từ 'tags' (mảng)
   Ưu tiên: sx→'s-x', chtr→'ch-tr', tone→'tone'; nếu không có thì lấy tag đầu tiên, mặc định 'general' */
(function ensureSingleTagForCards(){
  if (Array.isArray(window.CARDS)){
    window.CARDS = window.CARDS.map(c => {
      const tags = Array.isArray(c.tags) ? c.tags : [];
      let tag = 'general';
      if (tags.includes('sx')) tag = 's-x';
      else if (tags.includes('chtr')) tag = 'ch-tr';
      else if (tags.includes('tone')) tag = 'tone';
      else if (tags.length) tag = tags[0];
      return { ...c, tag };
    });
  }
})();

/* Bổ sung PASSAGES Level 6 để hệ thích ứng có cấp kế tiếp khả dụng */
(function addLevel6Passages(){
  if (!Array.isArray(window.PASSAGES)) window.PASSAGES = [];
  window.PASSAGES = window.PASSAGES.concat([
    {
      id:"p_026", level:6,
      text:"Trước buổi triển lãm khoa học của khối, nhóm của An thiết kế mô hình nhà tiết kiệm năng lượng. Các bạn lắp pin mặt trời mini, đấu mạch với đèn LED và gắn cảm biến ánh sáng để đèn tự bật khi tối. Ban đầu, đèn chập chờn vì dây nối lỏng và tấm pin đặt lệch góc. Nhóm kiểm tra lại sơ đồ, siết chặt đầu nối, rồi điều chỉnh tấm pin hướng về nguồn sáng mạnh hơn. Sau khi thử nhiều lần, hệ hoạt động ổn định: đèn tắt khi đủ sáng và bật khi che bớt ánh sáng. Cuối cùng, nhóm chuẩn bị bảng trình bày nêu rõ giả thuyết, cách thử và bài học rút ra về hướng đặt tấm pin.",
      questions:[
        { q:"Mục tiêu mô hình là gì?", choices:["Tiết kiệm năng lượng","Làm quạt giấy","Đun nước"], ans:0, type:"literal" },
        { q:"Vì sao đèn chập chờn lúc đầu?", choices:["Dây lỏng và pin lệch","Hết pin","Đèn hỏng"], ans:0, type:"inferential" },
        { q:"Nhóm đã làm gì để ổn định hệ?", choices:["Siết đầu nối, chỉnh pin","Thay bóng lớn","Giảm số đèn"], ans:0, type:"literal" }
      ]
    },
    {
      id:"p_027", level:6,
      text:"Câu lạc bộ báo chí tổ chức phỏng vấn một cô thủ thư về cách sắp xếp sách. Trước buổi phỏng vấn, các bạn phân vai: người hỏi chính, người ghi âm, người ghi chép nhanh và người chụp ảnh. Mỗi câu hỏi đều ngắn, rõ và bám sát mục tiêu: giúp học sinh tìm sách nhanh hơn. Sau cuộc trò chuyện, nhóm biên tập lại nội dung, kiểm tra trích dẫn và chọn ảnh minh họa. Bản tin cuối cùng được dán gần cổng thư viện, kèm hướng dẫn tra cứu trên máy tính.",
      questions:[
        { q:"Mục tiêu của buổi phỏng vấn là gì?", choices:["Giúp tìm sách nhanh hơn","Giới thiệu truyện tranh","Quảng cáo thư viện"], ans:0, type:"literal" },
        { q:"Những vai trò nào được phân công?", choices:["Hỏi, ghi âm, ghi chép, chụp ảnh","Chỉ một người làm tất cả","Chỉ chụp ảnh"], ans:0, type:"literal" }
      ]
    },
    {
      id:"p_028", level:6,
      text:"Trong cuộc thi robot đường line, đội bạn sử dụng cảm biến hồng ngoại và thuật toán đơn giản để bám vạch đen. Lúc chạy thử trên sân, robot bị dao động ở khúc cua gấp vì tốc độ cao. Cả đội giảm tốc độ khi phát hiện độ cong lớn và thêm bước lọc nhiễu cho tín hiệu cảm biến. Sau điều chỉnh, robot đi ổn định hơn, vào cua mượt và về đích đúng thời gian quy định. Trọng tài khen đội biết thử – sai – sửa dựa trên số liệu thực tế.",
      questions:[
        { q:"Vì sao robot dao động ở khúc cua?", choices:["Tốc độ cao","Thiếu bánh xe","Hết pin"], ans:0, type:"inferential" },
        { q:"Đội đã khắc phục như thế nào?", choices:["Giảm tốc, lọc nhiễu","Đổi màu vạch","Tắt cảm biến"], ans:0, type:"literal" }
      ]
    }
  ]);
})();

/* Cân bằng vị trí đáp án (ans) theo kiểu ngẫu nhiên ổn định:
   - Xoay (rotate) mảng choices theo một độ dịch r = hash(passageId|qIndex) % choices.length
   - Cập nhật ans = (ans + r) % choices.length
   → Giữ đúng–sai, nhưng vị trí đáp án đúng được phân bổ đều, tránh dồn về 0 */
(function balanceAnswerPositions(){
  try{
    if (!Array.isArray(window.PASSAGES)) return;
    window.PASSAGES.forEach(p=>{
      if (!Array.isArray(p.questions)) return;
      p.questions.forEach((q, qi)=>{
        const ch = Array.isArray(q.choices) ? q.choices : [];
        if (ch.length < 2) return;
        // hash ổn định từ id + index
        const key = String(p.id||'') + '|' + qi;
        let h = 0; for (let i=0;i<key.length;i++){ h = (h*31 + key.charCodeAt(i)) >>> 0; }
        const r = h % ch.length;
        if (r===0) return; // không xoay
        const rotated = ch.slice(-r).concat(ch.slice(0, ch.length - r)); // xoay phải r
        q.choices = rotated;
        q.ans = (q.ans + r) % ch.length;
      });
    });
  }catch(_){}
})();