import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Define translation resources
// Structure: { languageCode: { namespace: { key: value } } }
// We'll use a single 'translation' namespace for simplicity
const resources = {
  en: {
    translation: {
      // Navbar
      "nav_title": "CompassAI",
      "nav_login": "Login",
      "nav_register": "Register",
      "nav_settings": "Settings",
      "nav_logout": "Logout",
      // Login Page
      "login_title": "Login",
      "login_identifier_label": "Email or Username:",
      "login_password_label": "Password:",
      "login_button": "Login",
      "login_logging_in": "Logging in...",
      "login_no_account": "Don't have an account?",
      "login_register_link": "Register here",
      // Register Page
      "register_title": "Register",
      "register_username_label": "Username:",
      "register_email_label": "Email:",
      "register_password_label": "Password:",
      "register_confirm_password_label": "Confirm Password:",
      "register_referral_label": "Referral Code:",
      "register_button": "Register",
      "register_registering": "Registering...",
      "register_have_account": "Already have an account?",
      "register_login_link": "Login here",
      // Chat Page
      "chat_new_button": "+ New Chat",
      "chat_history_title": "Chat History",
      "chat_loading": "Loading chats...",
      "chat_no_history": "No chat history yet.",
      "chat_select_prompt": "Select a chat or start a new one.",
      "chat_share_button": "Share",
      "chat_unshare_button": "Unshare",
      "chat_share_link": "Shareable Link:",
      "chat_loading_messages": "Loading messages...",
      "chat_start_message": "Send a message to start the chat!",
      "chat_message_you": "You",
      "chat_message_ai": "AI",
      "chat_input_placeholder": "Type your message...",
      "chat_send_button": "Send",
      "chat_sending_button": "Sending...",
      "chat_model_select_label": "Model:",
       "chat_model_default": "Default (Auto-Select)",
       "chat_attach_file": "Attach file",
       "chat_attach_file_selected": "File: {{filename}}", // Added for selected file tooltip
       "chat_start_listening": "Start Listening", // Added for mic button
       "chat_stop_listening": "Stop Listening", // Added for mic button
       "chat_enable_streaming": "Streaming Response",
       "chat_reasoning_show_tooltip": "Show Reasoning Steps (Enables Streaming)", // Added
       "chat_reasoning_hide_tooltip": "Hide Reasoning Steps (Disables Streaming)", // Added
       "chat_sidebar_show_tooltip": "Show Chat History", // Added
       "chat_sidebar_hide_tooltip": "Hide Chat History", // Added
       "chat_delete_session_tooltip": "Delete chat: {{title}}", // Added
       "date_group_previous_7_days": "Previous 7 Days",
       "date_group_previous_30_days": "Previous 30 Days",
       "chat_no_sessions_in_group": "No chats in this period",
       // Settings Page
       "settings_title": "Settings",
      "settings_general_title": "General Settings",
      "settings_api_keys_title": "API Key Management",
      "settings_users_title": "User Management",
      "settings_referral_title": "Referral Code Management",
      // General terms
      "optional": "required", // Changed from Optional to required
      // Add more keys as needed
    }
  },
  vi: {
    translation: {
      // Navbar
      "nav_title": "CompassAI", // Keep brand name?
      "nav_login": "Đăng nhập",
      "nav_register": "Đăng ký",
      "nav_settings": "Cài đặt",
      "nav_logout": "Đăng xuất",
      // Login Page
      "login_title": "Đăng nhập",
      "login_identifier_label": "Email hoặc Tên đăng nhập:",
      "login_password_label": "Mật khẩu:",
      "login_button": "Đăng nhập",
      "login_logging_in": "Đang đăng nhập...",
      "login_no_account": "Chưa có tài khoản?",
      "login_register_link": "Đăng ký tại đây",
      // Register Page
      "register_title": "Đăng ký",
      "register_username_label": "Tên đăng nhập:",
      "register_email_label": "Email:",
      "register_password_label": "Mật khẩu:",
      "register_confirm_password_label": "Xác nhận Mật khẩu:",
      "register_referral_label": "Mã giới thiệu:",
      "register_button": "Đăng ký",
      "register_registering": "Đang đăng ký...",
      "register_have_account": "Đã có tài khoản?",
      "register_login_link": "Đăng nhập tại đây",
      // Chat Page
      "chat_new_button": "+ Trò chuyện mới",
      "chat_history_title": "Lịch sử trò chuyện",
      "chat_loading": "Đang tải cuộc trò chuyện...",
      "chat_no_history": "Chưa có lịch sử trò chuyện.",
      "chat_select_prompt": "Chọn một cuộc trò chuyện hoặc bắt đầu cuộc trò chuyện mới.",
      "chat_share_button": "Chia sẻ",
      "chat_unshare_button": "Bỏ chia sẻ",
      "chat_share_link": "Liên kết chia sẻ:",
      "chat_loading_messages": "Đang tải tin nhắn...",
      "chat_start_message": "Gửi tin nhắn để bắt đầu cuộc trò chuyện!",
      "chat_message_you": "Bạn",
      "chat_message_ai": "AI",
      "chat_input_placeholder": "Nhập tin nhắn của bạn...",
      "chat_send_button": "Gửi",
      "chat_sending_button": "Đang gửi...",
      "chat_model_select_label": "Mô hình:",
       "chat_model_default": "Mặc định (Tự động chọn)",
       "chat_attach_file": "Đính kèm tệp",
       "chat_attach_file_selected": "Tệp: {{filename}}", // Added
       "chat_start_listening": "Bắt đầu nghe", // Added
       "chat_stop_listening": "Dừng nghe", // Added
       "chat_enable_streaming": "Phản hồi Streaming",
       "chat_reasoning_show_tooltip": "Hiện các bước suy luận (Bật Streaming)", // Added
       "chat_reasoning_hide_tooltip": "Ẩn các bước suy luận (Tắt Streaming)", // Added
       "chat_sidebar_show_tooltip": "Hiện lịch sử trò chuyện", // Added
       "chat_sidebar_hide_tooltip": "Ẩn lịch sử trò chuyện", // Added
       "chat_delete_session_tooltip": "Xóa cuộc trò chuyện: {{title}}", // Added
       "date_group_previous_7_days": "7 ngày qua",
       "date_group_previous_30_days": "30 ngày qua",
       "chat_no_sessions_in_group": "Không có cuộc trò chuyện nào trong khoảng thời gian này",
       // Settings Page
       "settings_title": "Cài đặt",
      "settings_general_title": "Cài đặt chung",
      "settings_api_keys_title": "Quản lý Khóa API",
      "settings_users_title": "Quản lý Người dùng",
      "settings_referral_title": "Quản lý Mã giới thiệu",
      // General terms
      "optional": "bắt buộc", // Changed from Tùy chọn to bắt buộc
      // Add more keys as needed
    }
  }
};

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // Init i18next
  .init({
    resources,
    fallbackLng: 'en', // Use English if detected language is not available
    debug: true, // Set to false in production
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    detection: {
      // Order and from where user language should be detected
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Keys or attributes to lookup language from
      lookupLocalStorage: 'i18nextLng', // Save preference to localStorage
      // Cache user language on
      caches: ['localStorage'],
      // optional htmlTag with lang attribute, the default is:
      htmlTag: document.documentElement,
    }
  });

export default i18n;
