/******************************************************************************
 * @file           : main.c
 * @brief          : Main program body with extended test cases
 * (c) CG2028 Teaching Team
 ******************************************************************************/

#include "main.h"
#include "stdio.h"

extern void initialise_monitor_handles(void);   // for semi-hosting support (printf)
extern int mov_avg(int N, int* accel_buff);     // asm implementation

int mov_avg_C(int N, int* accel_buff);          // reference C implementation

/* -----------------------------------------------------------------------
 * run_test: Runs a single named test case.
 *
 * Parameters:
 *   test_name      : label printed in output
 *   N              : filter size (must be 4 for current implementation)
 *   sensor_data_x  : pointer to 16-element X axis data array
 *   sensor_data_y  : pointer to 16-element Y axis data array
 *   sensor_data_z  : pointer to 16-element Z axis data array
 *
 * Returns 1 if all iterations pass, 0 if any mismatch found.
 * ----------------------------------------------------------------------- */
int run_test(const char* test_name,
             int N,
             int* sensor_data_x,
             int* sensor_data_y,
             int* sensor_data_z)
{
    int accel_buff_x[4] = {0};
    int accel_buff_y[4] = {0};
    int accel_buff_z[4] = {0};

    int filt_avg_c[3];
    int filt_avg_asm[3];

    int num   = 0;
    int count = 0;
    int pass  = 1;

    printf("\n========================================\n");
    printf("TEST: %s\n", test_name);
    printf("========================================\n");

    /* Loop runs for 16 - 3 = 13 iterations.
     * First iteration uses indices 0..0 (with zeros padding buffer).
     * Last  iteration uses indices 12..15 in the circular buffer. */
    while (num < 13)
    {
        accel_buff_x[count % 4] = sensor_data_x[num];
        accel_buff_y[count % 4] = sensor_data_y[num];
        accel_buff_z[count % 4] = sensor_data_z[num];
        count++;

        /* Reference C implementation */
        filt_avg_c[0] = mov_avg_C(N, accel_buff_x);
        filt_avg_c[1] = mov_avg_C(N, accel_buff_y);
        filt_avg_c[2] = mov_avg_C(N, accel_buff_z);

        /* Assembly implementation */
        filt_avg_asm[0] = mov_avg(N, accel_buff_x);
        filt_avg_asm[1] = mov_avg(N, accel_buff_y);
        filt_avg_asm[2] = mov_avg(N, accel_buff_z);

        /* Compare */
        if ((filt_avg_asm[0] != filt_avg_c[0]) ||
            (filt_avg_asm[1] != filt_avg_c[1]) ||
            (filt_avg_asm[2] != filt_avg_c[2]))
        {
            printf("[FAIL] Iteration %2d:\n", num);
            printf("  X -> Expected: %d, Got: %d\n", filt_avg_c[0], filt_avg_asm[0]);
            printf("  Y -> Expected: %d, Got: %d\n", filt_avg_c[1], filt_avg_asm[1]);
            printf("  Z -> Expected: %d, Got: %d\n", filt_avg_c[2], filt_avg_asm[2]);
            pass = 0;
        }
        else
        {
            printf("[PASS] Iteration %2d: X=%d, Y=%d, Z=%d\n",
                   num, filt_avg_c[0], filt_avg_c[1], filt_avg_c[2]);
        }

        num++;
    }

    if (pass)
        printf(">> RESULT: %s PASSED\n", test_name);
    else
        printf(">> RESULT: %s FAILED\n", test_name);

    return pass;
}

/* -----------------------------------------------------------------------
 * Main
 * ----------------------------------------------------------------------- */
int main(void)
{
    const int N = 4;
    int all_passed = 1;

    initialise_monitor_handles();
    HAL_Init();

    /* ------------------------------------------------------------------ */
    /* TC1: Sequential increasing values                                   */
    /* ------------------------------------------------------------------ */
    int tc1_x[16] = {1000,1001,1002,1003,1004,1005,1006,1007,
                     1008,1009,1010,1011,1012,1013,1014,1015};
    int tc1_y[16] = {1016,1017,1018,1019,1020,1021,1022,1023,
                     1024,1025,1026,1027,1028,1029,1030,1031};
    int tc1_z[16] = {1032,1033,1034,1035,1036,1037,1038,1039,
                     1040,1041,1042,1043,1044,1045,1046,1047};
    all_passed &= run_test("TC1: Sequential Increasing", N, tc1_x, tc1_y, tc1_z);

    /* ------------------------------------------------------------------ */
    /* TC2: All zeros                                                       */
    /* ------------------------------------------------------------------ */
    int tc2_x[16] = {0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0};
    int tc2_y[16] = {0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0};
    int tc2_z[16] = {0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0};
    all_passed &= run_test("TC2: All Zeros", N, tc2_x, tc2_y, tc2_z);

    /* ------------------------------------------------------------------ */
    /* TC3: Realistic sensor values (original test from template)          */
    /* ------------------------------------------------------------------ */
    int tc3_x[16] = {6030,6000,4389,4488,6734,5009,7318,6040,
                     5000,5643,3888,3488,3488,3488,4876,5010};
    int tc3_y[16] = {9800,9800,6573,6753,5004,5895,4321,6753,
                     9004,3005,6934,4444,7981,5144,5867,4178};
    int tc3_z[16] = {5455,6177,8653,7777,6520,4566,7860,5199,
                     6233,5444,9822,3455,6445,7888,4113,4998};
    all_passed &= run_test("TC3: Realistic Sensor Values", N, tc3_x, tc3_y, tc3_z);

    /* ------------------------------------------------------------------ */
    /* TC4: All negative values                                            */
    /* Tests ASR sign extension for negative numbers.                     */
    /* ------------------------------------------------------------------ */
    int tc4_x[16] = {-4,-8,-12,-16,-20,-24,-28,-32,
                     -36,-40,-44,-48,-52,-56,-60,-64};
    int tc4_y[16] = {-100,-200,-300,-400,-500,-600,-700,-800,
                     -900,-1000,-1100,-1200,-1300,-1400,-1500,-1600};
    int tc4_z[16] = {-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,
                     -1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000};
    all_passed &= run_test("TC4: All Negative Values", N, tc4_x, tc4_y, tc4_z);

    /* ------------------------------------------------------------------ */
    /* TC5: Alternating positive/negative (cancels to zero once full)      */
    /* Tests mixed-sign accumulation and steady-state zero output.         */
    /* ------------------------------------------------------------------ */
    int tc5_x[16] = { 100,-100, 100,-100, 100,-100, 100,-100,
                      100,-100, 100,-100, 100,-100, 100,-100};
    int tc5_y[16] = { 200,-200, 200,-200, 200,-200, 200,-200,
                      200,-200, 200,-200, 200,-200, 200,-200};
    int tc5_z[16] = {   4,  -4,   4,  -4,   4,  -4,   4,  -4,
                        4,  -4,   4,  -4,   4,  -4,   4,  -4};
    all_passed &= run_test("TC5: Alternating +/-", N, tc5_x, tc5_y, tc5_z);

    /* ------------------------------------------------------------------ */
    /* TC6: Large values (accumulator stress test, no overflow in 32-bit)  */
    /* 4 x 500000 = 2000000, well within signed 32-bit range.             */
    /* ------------------------------------------------------------------ */
    int tc6_x[16] = { 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000,
                      500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000};
    int tc6_y[16] = {-500000,-500000,-500000,-500000,-500000,-500000,-500000,-500000,
                     -500000,-500000,-500000,-500000,-500000,-500000,-500000,-500000};
    int tc6_z[16] = {1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,
                     1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000};
    all_passed &= run_test("TC6: Large Values", N, tc6_x, tc6_y, tc6_z);

    /* ------------------------------------------------------------------ */
    /* TC7: Ramp down (monotonically decreasing)                           */
    /* Tests that moving average lags and decreases smoothly.             */
    /* Z is constant as a sanity anchor.                                  */
    /* ------------------------------------------------------------------ */
    int tc7_x[16] = {1600,1500,1400,1300,1200,1100,1000,900,
                      800, 700, 600, 500, 400, 300, 200, 100};
    int tc7_y[16] = {3200,3000,2800,2600,2400,2200,2000,1800,
                     1600,1400,1200,1000, 800, 600, 400, 200};
    int tc7_z[16] = { 400, 400, 400, 400, 400, 400, 400, 400,
                      400, 400, 400, 400, 400, 400, 400, 400};
    all_passed &= run_test("TC7: Ramp Down", N, tc7_x, tc7_y, tc7_z);

    /* ------------------------------------------------------------------ */
    /* Final summary                                                        */
    /* ------------------------------------------------------------------ */
    printf("\n========================================\n");
    if (all_passed)
        printf("ALL TESTS PASSED\n");
    else
        printf("SOME TESTS FAILED - see details above\n");
    printf("========================================\n");
    printf("Exiting main\n");

    return 0;
}

/* -----------------------------------------------------------------------
 * Reference C implementation (inefficient, for verification only)
 * ----------------------------------------------------------------------- */
int mov_avg_C(int N, int* accel_buff)
{
    int result = 0;
    for (int i = 0; i < N; i++)
    {
        result += accel_buff[i];
    }
    result = result / 4;   /* Intentionally hardcoded /4 to match ASR #2 in asm */
    return result;
}
