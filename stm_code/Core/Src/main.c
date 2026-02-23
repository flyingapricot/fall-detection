/******************************************************************************
 * @file           : main.c
 * @brief          : Main program body
 * (c) CG2028 Teaching Team
 ******************************************************************************/

/*--------------------------- Includes ---------------------------------------*/
#include "main.h"
#include "../../Drivers/BSP/B-L4S5I-IOT01/stm32l4s5i_iot01_accelero.h"
#include "../../Drivers/BSP/B-L4S5I-IOT01/stm32l4s5i_iot01_tsensor.h"
#include "../../Drivers/BSP/B-L4S5I-IOT01/stm32l4s5i_iot01_gyro.h"
#include "../../Drivers/BSP/B-L4S5I-IOT01/stm32l4s5i_iot01_psensor.h"

#include "stdio.h"
#include "string.h"
#include <sys/stat.h>
#include <math.h>

static void UART1_Init(void);

extern void initialise_monitor_handles(void);
extern int mov_avg(int N, int* accel_buff);
int mov_avg_C(int N, int* accel_buff);

UART_HandleTypeDef huart1;

#define WIFI_SSID     "SINGTEL-A939(2.4G)"
#define WIFI_PASSWORD "E38xEuj7jpGEAQK"
#define WIFI_SECURITY WIFI_ECN_WPA2_PSK

#define REMOTE_PORT    50066
#define WIFI_SOCKET    0
#define BOARD_NUMBER 1

// Buzzer pin definition - PA4 (D7)
#define BUZZER_PIN GPIO_PIN_4
#define BUZZER_PORT GPIOA

// Fall detection thresholds
#define FREEFALL_THRESHOLD  6.5f    // Must be a deeper drop, not just a quick lift
#define IMPACT_THRESHOLD     13.0f   // Higher - only extreme spikes count as direct impact
#define IMPACT_DELTA        2.0f
#define IMPACT_GYRO_MAX     200.0f   // Add this - gyro must be LOW at moment of impact
#define GYRO_THRESHOLD       1200.0f
#define LYING_THRESHOLD      11.0f
#define FALL_DETECTION_TIME  2000
#define LYING_DETECTION_TIME 2000

// Timing
#define SAMPLE_DELAY_MS   50         // 20Hz sampling - catches short impact spikes
#define PRINT_INTERVAL_MS 500        // Only print to UART every 500ms
#define WIFI_INTERVAL_MS  200        // Send WiFi data every 200ms

// Fall detection states
typedef enum {
    STATE_NORMAL = 0,
    STATE_FREEFALL_DETECTED = 1,
    STATE_IMPACT_DETECTED = 2,
    STATE_FALL_CONFIRMED = 3
} FallState;

// Global variables
FallState fall_state = STATE_NORMAL;
uint32_t freefall_timestamp = 0;
uint32_t impact_timestamp = 0;
uint32_t lying_timestamp = 0;
uint32_t last_led_toggle = 0;
uint32_t last_buzzer_toggle = 0;

static int TCPConnected = 0;
static int fallStatus = 0;

uint8_t remote_ip[4] = {66, 33, 22, 238};


static void uart_log(const char *msg)
{
    HAL_UART_Transmit(&huart1, (uint8_t*)msg, strlen(msg), HAL_MAX_DELAY);
}

static void uart_logf(const char *fmt, ...)
{
    char buffer[256];
    va_list args;
    va_start(args, fmt);
    vsnprintf(buffer, sizeof(buffer), fmt, args);
    va_end(args);
    HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
}

// WiFi Functions
int wifiConnect(uint8_t out_ip[4])
{
    uint8_t mac[6] = {0};
    uint8_t ip[4]  = {0};

    uart_log("Starting WiFi...\r\n");

    if (WIFI_Init() != WIFI_STATUS_OK)
    {
        uart_log("> ERROR : WIFI Module cannot be initialized.\r\n");
        return -1;
    }
    uart_log("> WIFI Module Initialized.\r\n");

    if (WIFI_GetMAC_Address(mac, sizeof(mac)) != WIFI_STATUS_OK)
    {
        uart_log("> ERROR : CANNOT get MAC address\r\n");
        return -1;
    }
    uart_logf("> eS-WiFi module MAC Address : %02X:%02X:%02X:%02X:%02X:%02X\r\n",
              mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

    uart_logf("> Connecting to SSID: %s\r\n", WIFI_SSID);

    if (WIFI_Connect((char*)WIFI_SSID, (char*)WIFI_PASSWORD, WIFI_SECURITY) != WIFI_STATUS_OK)
    {
        uart_log("> ERROR : es-wifi module NOT connected\r\n");
        return -1;
    }
    uart_log("> es-wifi module connected\r\n");

    if (WIFI_GetIP_Address(ip, sizeof(ip)) != WIFI_STATUS_OK)
    {
        uart_log("> ERROR : es-wifi module CANNOT get IP address\r\n");
        return -1;
    }
    uart_logf("> IP Address : %d.%d.%d.%d\r\n", ip[0], ip[1], ip[2], ip[3]);

    if (out_ip)
        memcpy(out_ip, ip, 4);

    return 0;
}

int wifiTCPConnect(uint8_t *remote_ip)
{
    uart_log("Opening TCP connection...\r\n");

    if (WIFI_OpenClientConnection(WIFI_SOCKET, WIFI_TCP_PROTOCOL, "client",
                                   remote_ip, REMOTE_PORT, 0) != WIFI_STATUS_OK)
    {
        uart_log("> ERROR : Cannot open TCP connection\r\n");
        return -1;
    }
    uart_logf("> Connected to %d.%d.%d.%d:%d\r\n",
              remote_ip[0], remote_ip[1], remote_ip[2], remote_ip[3], REMOTE_PORT);
    return 0;
}

int wifiTCPSend(const char *data)
{
	    uint16_t sent_len = 0;
	    uint16_t len = strlen(data);

	    if (WIFI_SendData(WIFI_SOCKET, (uint8_t*)data, len, &sent_len, 5000) != WIFI_STATUS_OK)
	    {
	        uart_log("> TCP send failed, reconnecting...\r\n");

	        // Close and reopen connection
	        WIFI_CloseClientConnection(WIFI_SOCKET);
	        HAL_Delay(500);

	        if (WIFI_OpenClientConnection(WIFI_SOCKET, WIFI_TCP_PROTOCOL, "client",
	                                       remote_ip, REMOTE_PORT, 0) != WIFI_STATUS_OK)
	        {
	            uart_log("> ERROR : Reconnection failed\r\n");
	            TCPConnected = 0;
	            return -1;
	        }

	        uart_log("> Reconnected, retrying send...\r\n");

	        // Retry once
	        if (WIFI_SendData(WIFI_SOCKET, (uint8_t*)data, len, &sent_len, 5000) != WIFI_STATUS_OK)
	        {
	            uart_log("> ERROR : Retry failed\r\n");
	            return -1;
	        }
	    }

	    return (int)sent_len;}

int wifiTCPDisconnect(void)
{
    WIFI_CloseClientConnection(WIFI_SOCKET);
    uart_log("> TCP connection closed\r\n");
    return 0;
}

// Buzzer functions
void Buzzer_Init(void)
{
    __HAL_RCC_GPIOA_CLK_ENABLE();

    GPIO_InitTypeDef GPIO_InitStruct = {0};
    GPIO_InitStruct.Pin = BUZZER_PIN;
    GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
    GPIO_InitStruct.Pull = GPIO_NOPULL;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
    HAL_GPIO_Init(BUZZER_PORT, &GPIO_InitStruct);

    HAL_GPIO_WritePin(BUZZER_PORT, BUZZER_PIN, GPIO_PIN_RESET);
}

void Buzzer_On(void)     { HAL_GPIO_WritePin(BUZZER_PORT, BUZZER_PIN, GPIO_PIN_SET); }
void Buzzer_Off(void)    { HAL_GPIO_WritePin(BUZZER_PORT, BUZZER_PIN, GPIO_PIN_RESET); }
void Buzzer_Toggle(void) { HAL_GPIO_TogglePin(BUZZER_PORT, BUZZER_PIN); }


int main(void)
{
    const int N = 4;
    uint8_t local_ip[4];

    HAL_Init();
    UART1_Init();

    BSP_LED_Init(LED2);
    BSP_ACCELERO_Init();
    BSP_GYRO_Init();
    Buzzer_Init();

    BSP_LED_Off(LED2);
    Buzzer_Off();
    BSP_PSENSOR_Init();


    uart_log("Testing HAL_Delay...\r\n");
    HAL_Delay(500);
    uart_log("HAL_Delay works!\r\n");


    if (wifiConnect(local_ip) == 0)
    {
        if (wifiTCPConnect(remote_ip) == 0) {
            TCPConnected = 1;
            uart_log("TCP Connection Succeeded!\n");
        } else {
            uart_log("TCP Connection Failed!\n");
        }
    }
    else
    {
        uart_log("Wifi Connection Failed\n");
    }

    int accel_buff_x[4] = {0};
    int accel_buff_y[4] = {0};
    int accel_buff_z[4] = {0};
    int i = 0;

    float prev_accel_magnitude = 9.8f;   // For delta-based impact detection
    uint32_t last_print_time = 0;        // Rate-limit UART printing
    uint32_t last_wifi_send_time = 0;    // Rate-limit WiFi sending

    while (1)
    {
        uint32_t current_time = HAL_GetTick();
        int do_print = ((current_time - last_print_time) > PRINT_INTERVAL_MS);

        // ---- Read sensors (every loop at 20Hz) ----
        int16_t accel_data_i16[3] = {0};
        BSP_ACCELERO_AccGetXYZ(accel_data_i16);

        accel_buff_x[i%4] = accel_data_i16[0];
        accel_buff_y[i%4] = accel_data_i16[1];
        accel_buff_z[i%4] = accel_data_i16[2];

        float gyro_data[3] = {0.0};
        BSP_GYRO_GetXYZ(gyro_data);

        float gyro_velocity[3] = {0.0};
        gyro_velocity[0] = gyro_data[0] * 9.8f / 1000.0f;
        gyro_velocity[1] = gyro_data[1] * 9.8f / 1000.0f;
        gyro_velocity[2] = gyro_data[2] * 9.8f / 1000.0f;

        float accel_filt_asm[3] = {0};
        float accel_filt_c[3]   = {0};

        if(i >= 3)
        {
            accel_filt_asm[0] = (float)mov_avg(N, accel_buff_x) * (9.8f/1000.0f);
            accel_filt_asm[1] = (float)mov_avg(N, accel_buff_y) * (9.8f/1000.0f);
            accel_filt_asm[2] = (float)mov_avg(N, accel_buff_z) * (9.8f/1000.0f);

            accel_filt_c[0] = (float)mov_avg_C(N, accel_buff_x) * (9.8f/1000.0f);
            accel_filt_c[1] = (float)mov_avg_C(N, accel_buff_y) * (9.8f/1000.0f);
            accel_filt_c[2] = (float)mov_avg_C(N, accel_buff_z) * (9.8f/1000.0f);
        }

        // ---- Rate-limited UART prints ----
        char buffer[200];

        if(do_print && i >= 3)
        {
            last_print_time = current_time;

            sprintf(buffer, "Results of C execution for filtered accelerometer readings:\r\n");
            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);

            sprintf(buffer, "Averaged X : %f; Averaged Y : %f; Averaged Z : %f;\r\n",
                    accel_filt_c[0], accel_filt_c[1], accel_filt_c[2]);
            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);

            sprintf(buffer, "Results of assembly execution for filtered accelerometer readings:\r\n");
            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);

            sprintf(buffer, "Averaged X : %f; Averaged Y : %f; Averaged Z : %f;\r\n",
                    accel_filt_asm[0], accel_filt_asm[1], accel_filt_asm[2]);
            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);

            sprintf(buffer, "Gyroscope sensor readings:\r\n");
            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);

            sprintf(buffer, "Averaged X : %f; Averaged Y : %f; Averaged Z : %f;\r\n\n",
                    gyro_velocity[0], gyro_velocity[1], gyro_velocity[2]);
            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
        }

        // ---- Fall detection (runs every loop at 20Hz) ----
        if(i >= 3)
        {
            float accel_magnitude = sqrtf(accel_filt_asm[0]*accel_filt_asm[0] +
                                           accel_filt_asm[1]*accel_filt_asm[1] +
                                           accel_filt_asm[2]*accel_filt_asm[2]);

            float gyro_magnitude = sqrtf(gyro_velocity[0]*gyro_velocity[0] +
                                          gyro_velocity[1]*gyro_velocity[1] +
                                          gyro_velocity[2]*gyro_velocity[2]);

            float accel_delta = accel_magnitude - prev_accel_magnitude;

            // Debug line - rate limited
            if(do_print)
            {
                sprintf(buffer, "DEBUG: Accel: %.2f m/s², Delta: %.2f, Gyro: %.2f deg/s, State: %d\r\n",
                        accel_magnitude, accel_delta, gyro_magnitude, fall_state);
                HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
            }

            // ---- LED and buzzer patterns based on state ----
            if(fall_state == STATE_FALL_CONFIRMED)
            {
                // EMERGENCY: fast LED blink + buzzer beeping
                if((current_time - last_led_toggle) > 100)
                {
                    BSP_LED_Toggle(LED2);
                    last_led_toggle = current_time;
                }
                if((current_time - last_buzzer_toggle) > 200)
                {
                    Buzzer_Toggle();
                    last_buzzer_toggle = current_time;
                }
                fallStatus = 1;
            }
            else if(fall_state == STATE_IMPACT_DETECTED)
            {
                // WARNING: medium LED blink, no buzzer
                if((current_time - last_led_toggle) > 250)
                {
                    BSP_LED_Toggle(LED2);
                    last_led_toggle = current_time;
                }
                Buzzer_Off();
                fallStatus = 0;
            }
            else
            {
                // NORMAL: slow LED blink, everything off
                if((current_time - last_led_toggle) > 1000)
                {
                    BSP_LED_Toggle(LED2);
                    last_led_toggle = current_time;
                }
                Buzzer_Off();
                fallStatus = 0;
            }

            // ---- State machine ----
            switch(fall_state)
            {
				case STATE_NORMAL:
					// ONLY look for freefall - do NOT trigger on impact alone
					// This prevents false triggers from simply lifting the board
					if(accel_magnitude < FREEFALL_THRESHOLD)
					{
						fall_state = STATE_FREEFALL_DETECTED;
						freefall_timestamp = current_time;
						sprintf(buffer, "*** FREEFALL DETECTED! Magnitude: %.2f m/s² ***\r\n", accel_magnitude);
						HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
					}
					break;

                case STATE_FREEFALL_DETECTED:
                    // Impact = absolute spike OR sudden positive delta
                    if((accel_magnitude > IMPACT_THRESHOLD || accel_delta > IMPACT_DELTA) && gyro_magnitude < IMPACT_GYRO_MAX)
                    {
                        if((current_time - freefall_timestamp) < FALL_DETECTION_TIME)
                        {
                            fall_state = STATE_IMPACT_DETECTED;
                            impact_timestamp = current_time;
                            lying_timestamp = 0;
                            sprintf(buffer, "*** IMPACT AFTER FREEFALL! Accel: %.2f m/s², Delta: %.2f ***\r\n",
                                    accel_magnitude, accel_delta);
                            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
                        }
                        else
                        {
                            fall_state = STATE_NORMAL;
                            sprintf(buffer, "*** Freefall timeout - returning to normal ***\r\n");
                            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
                        }
                    }
                    else if((current_time - freefall_timestamp) > FALL_DETECTION_TIME)
                    {
                        fall_state = STATE_NORMAL;
                        sprintf(buffer, "*** No impact after freefall - returning to normal ***\r\n");
                        HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
                    }
                    break;

                case STATE_IMPACT_DETECTED:
                    // Wait for board to be still (person lying on ground)
                    if(accel_magnitude < LYING_THRESHOLD && gyro_magnitude < GYRO_THRESHOLD)
                    {
                        if(lying_timestamp == 0)
                        {
                            lying_timestamp = current_time;
                            sprintf(buffer, "*** Board still - fall countdown started (2 sec)... ***\r\n");
                            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
                        }
                        else if((current_time - lying_timestamp) > LYING_DETECTION_TIME)
                        {
                            fall_state = STATE_FALL_CONFIRMED;
                            sprintf(buffer, "\r\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\r\n");
                            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
                            sprintf(buffer, "!!! FALL CONFIRMED - HELP NEEDED !!!\r\n");
                            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
                            sprintf(buffer, "!!! BUZZER AND LED ALARM ACTIVE  !!!\r\n");
                            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
                            sprintf(buffer, "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\r\n\r\n");
                            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
                        }
                        else if(do_print)
                        {
                            uint32_t time_remaining = LYING_DETECTION_TIME - (current_time - lying_timestamp);
                            sprintf(buffer, "*** Still lying... %.1f seconds remaining ***\r\n",
                                    time_remaining / 1000.0f);
                            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
                        }
                    }
                    else
                    {
                        if(lying_timestamp != 0)
                        {
                            sprintf(buffer, "*** Movement detected - resetting countdown ***\r\n");
                            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
                        }
                        lying_timestamp = 0;

                        if((current_time - impact_timestamp) > 5000)
                        {
                            fall_state = STATE_NORMAL;
                            sprintf(buffer, "*** Person recovered - returning to normal monitoring ***\r\n");
                            HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
                        }
                    }
                    break;

                case STATE_FALL_CONFIRMED:
                {

                    // Fallback timeout (30 seconds)
                    if((current_time - impact_timestamp) > 30000) {
                        fall_state = STATE_NORMAL;
                        fallStatus = 0;
                        Buzzer_Off();
                        BSP_LED_Off(LED2);
                        uart_log("Fall auto-reset (timeout)\r\n");
                        break;
                    }

                    static uint32_t last_alert_time = 0;
                    if((current_time - last_alert_time) > 5000)
                    {
                        sprintf(buffer, "*** EMERGENCY ALERT ACTIVE - BUZZER SOUNDING ***\r\n");
                        HAL_UART_Transmit(&huart1, (uint8_t*)buffer, strlen(buffer), HAL_MAX_DELAY);
                        last_alert_time = current_time;
                    }
                    break;
                }

                default:
                    break;
            }

            prev_accel_magnitude = accel_magnitude;
        }

        // ---- WiFi send (rate limited) ----
        if(TCPConnected == 1 && i >= 3)
        {
            if((current_time - last_wifi_send_time) > WIFI_INTERVAL_MS)
            {
                last_wifi_send_time = current_time;
                char msg[256];
                sprintf(msg, "%.2f,%.2f,%.2f,%.2f,%.2f,%.2f,%d,%d,%d\n",
                        accel_filt_c[0], accel_filt_c[1], accel_filt_c[2],
                        gyro_velocity[0], gyro_velocity[1], gyro_velocity[2],
                        fallStatus, BOARD_NUMBER,fall_state);
                wifiTCPSend(msg);
            }
        }

        HAL_Delay(SAMPLE_DELAY_MS);  // 20Hz
        i++;
    }
}


int mov_avg_C(int N, int* accel_buff)
{
    int result = 0;
    for(int i = 0; i < N; i++)
        result += accel_buff[i];
    result = result / 4;
    return result;
}

static void UART1_Init(void)
{
    __HAL_RCC_GPIOB_CLK_ENABLE();
    __HAL_RCC_USART1_CLK_ENABLE();

    GPIO_InitTypeDef GPIO_InitStruct = {0};
    GPIO_InitStruct.Alternate = GPIO_AF7_USART1;
    GPIO_InitStruct.Pin = GPIO_PIN_7 | GPIO_PIN_6;
    GPIO_InitStruct.Mode = GPIO_MODE_AF_PP;
    GPIO_InitStruct.Pull = GPIO_NOPULL;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_VERY_HIGH;
    HAL_GPIO_Init(GPIOB, &GPIO_InitStruct);

    huart1.Instance = USART1;
    huart1.Init.BaudRate = 115200;
    huart1.Init.WordLength = UART_WORDLENGTH_8B;
    huart1.Init.StopBits = UART_STOPBITS_1;
    huart1.Init.Parity = UART_PARITY_NONE;
    huart1.Init.Mode = UART_MODE_TX_RX;
    huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
    huart1.Init.OverSampling = UART_OVERSAMPLING_16;
    huart1.Init.OneBitSampling = UART_ONE_BIT_SAMPLE_DISABLE;
    huart1.AdvancedInit.AdvFeatureInit = UART_ADVFEATURE_NO_INIT;
    if (HAL_UART_Init(&huart1) != HAL_OK)
        while(1);
}

void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin)
{
    if (GPIO_Pin == GPIO_PIN_1)
        SPI_WIFI_ISR();
}

int _read(int file, char *ptr, int len) { return 0; }
int _fstat(int file, struct stat *st) { return 0; }
int _lseek(int file, int ptr, int dir) { return 0; }
int _isatty(int file) { return 1; }
int _close(int file) { return -1; }
int _getpid(void) { return 1; }
int _kill(int pid, int sig) { return -1; }

int _write(int file, char *ptr, int len)
{
    HAL_UART_Transmit(&huart1, (uint8_t*)ptr, len, HAL_MAX_DELAY);
    return len;
}
