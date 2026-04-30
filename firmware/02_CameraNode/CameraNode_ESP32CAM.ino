/*
 * AgriSense — Camera Node (ESP32-CAM)
 * ─────────────────────────────────────
 * Board: AI Thinker ESP32-CAM
 *
 * Role:
 *   - Joins the WiFi AP created by the Sensor ESP32 ("AgriSense_IoT")
 *   - Gets a fixed IP from the AP: 192.168.4.2
 *   - Serves MJPEG stream at http://192.168.4.2/stream
 *   - The dashboard at 192.168.4.1 auto-connects to this stream
 *
 * NO buzzer, NO LED, NO relay — those are on the Sensor ESP32.
 *
 * Upload:
 *   Use a USB-TTL / FTDI adapter:
 *     TX  → UOR (RXD pin)
 *     RX  → UOT (TXD pin)
 *     GND → GND
 *     5V  → 5V
 *     IO0 → GND  ← only during flashing, remove after upload
 *
 * Board setting in Arduino IDE: "AI Thinker ESP32-CAM"
 */

#include "esp_camera.h"
#include "esp_http_server.h"
#include "WiFi.h"

// ── Must match the AP created by the Sensor ESP32 ─────────────────
#define WIFI_SSID  "AgriSense_IoT"
#define WIFI_PASS  "admin1234"
// ──────────────────────────────────────────────────────────────────

// AI-Thinker ESP32-CAM pin map (do NOT change)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

static camera_config_t cam_cfg = {
  .pin_pwdn     = PWDN_GPIO_NUM,  .pin_reset    = RESET_GPIO_NUM,
  .pin_xclk     = XCLK_GPIO_NUM,
  .pin_sscb_sda = SIOD_GPIO_NUM,  .pin_sscb_scl = SIOC_GPIO_NUM,
  .pin_d7 = Y9_GPIO_NUM, .pin_d6 = Y8_GPIO_NUM, .pin_d5 = Y7_GPIO_NUM,
  .pin_d4 = Y6_GPIO_NUM, .pin_d3 = Y5_GPIO_NUM, .pin_d2 = Y4_GPIO_NUM,
  .pin_d1 = Y3_GPIO_NUM, .pin_d0 = Y2_GPIO_NUM,
  .pin_vsync = VSYNC_GPIO_NUM, .pin_href = HREF_GPIO_NUM, .pin_pclk = PCLK_GPIO_NUM,
  .xclk_freq_hz  = 20000000,
  .ledc_timer    = LEDC_TIMER_0,
  .ledc_channel  = LEDC_CHANNEL_0,
  .pixel_format  = PIXFORMAT_JPEG,
  .frame_size    = FRAMESIZE_VGA,   // 640×480
  .jpeg_quality  = 14,              // 0 best, 63 worst
  .fb_count      = 2,
  .grab_mode     = CAMERA_GRAB_WHEN_EMPTY
};

// ── MJPEG stream handler ───────────────────────────────────────────
static esp_err_t streamHandler(httpd_req_t *req) {
  camera_fb_t *fb = NULL;
  char part_buf[64];
  httpd_resp_set_type(req, "multipart/x-mixed-replace; boundary=frame");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) break;
    snprintf(part_buf, 64, "Content-Length: %u\r\n\r\n", (uint32_t)fb->len);
    if (httpd_resp_send_chunk(req, "\r\n--frame\r\nContent-Type: image/jpeg\r\n", 37) != ESP_OK) break;
    if (httpd_resp_send_chunk(req, part_buf, strlen(part_buf)) != ESP_OK) break;
    if (httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len) != ESP_OK) break;
    esp_camera_fb_return(fb);
    fb = NULL;
  }
  if (fb) esp_camera_fb_return(fb);
  return ESP_OK;
}

// ── Single JPEG capture ───────────────────────────────────────────
static esp_err_t captureHandler(httpd_req_t *req) {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }
  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET, OPTIONS");
  httpd_resp_set_hdr(req, "Content-Disposition", "attachment; filename=agrisense.jpg");
  httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  Serial.println("[CAM] Capture served");
  return ESP_OK;
}

// ── Root redirect → sensor dashboard ──────────────────────────────
static esp_err_t rootHandler(httpd_req_t *req) {
  httpd_resp_set_hdr(req, "Location", "http://192.168.4.1");
  httpd_resp_set_status(req, "302 Found");
  return httpd_resp_send(req, NULL, 0);
}

static void startCamServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  
  httpd_handle_t server = NULL;
  if (httpd_start(&server, &config) == ESP_OK) {
    httpd_uri_t capture_uri = { .uri = "/capture", .method = HTTP_GET, .handler = captureHandler };
    httpd_uri_t root_uri    = { .uri = "/",        .method = HTTP_GET, .handler = rootHandler    };
    httpd_register_uri_handler(server, &capture_uri);
    httpd_register_uri_handler(server, &root_uri);
    Serial.println("[CAM] Control server started on port 80 (/capture)");
  }

  config.server_port = 81;
  config.ctrl_port = 32769; // Use alternate control port for second server instance
  httpd_handle_t stream_server = NULL;
  if (httpd_start(&stream_server, &config) == ESP_OK) {
    httpd_uri_t stream_uri  = { .uri = "/stream",  .method = HTTP_GET, .handler = streamHandler  };
    httpd_register_uri_handler(stream_server, &stream_uri);
    Serial.println("[CAM] Stream server started on port 81 (/stream)");
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== AgriSense Camera Node ===");

  // Init camera
  if (esp_camera_init(&cam_cfg) != ESP_OK) {
    Serial.println("[CAM] Camera init FAILED — check ribbon cable & 5V supply");
    return;
  }
  Serial.println("[CAM] Camera OK");

  // Join the Sensor ESP32's AP — will receive IP 192.168.4.2
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("[WiFi] Joining '%s'", WIFI_SSID);

  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - t0 > 15000) {
      Serial.println("\n[WiFi] Timeout — could not join AgriSense_IoT AP");
      return;
    }
    delay(400);
    Serial.print(".");
  }
  Serial.printf("\n[CAM] IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("[CAM] Stream: http://%s/stream\n", WiFi.localIP().toString().c_str());

  startCamServer();
}

void loop() {
  delay(1000);  // Camera server runs on its own FreeRTOS task
}