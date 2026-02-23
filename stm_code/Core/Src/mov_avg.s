/*
 * mov_avg.s
 *
 * Created on: 2/2/2026
 * Author: Hitesh B, Hou Linxin
 */
.syntax unified
.cpu cortex-m4
.thumb
.global mov_avg
.equ N_MAX, 8
.bss
.align 4

.text
.align 2
@ CG2028 Assignment, Sem 2, AY 2025/26
@ (c) ECE NUS, 2025
@ Write Student 1's Name here: ABCD (A1234567R)
@ Write Student 2's Name here: WXYZ (A0000007X)
@ Register usage:
@ R0: N (number of samples to average)
@ R1: accel_buff (pointer to buffer)
@ R2: loop counter
@ R3: accumulator (sum)
@ R4: temporary value holder
@ R0 (return): average value

mov_avg:
    PUSH {r2-r11, lr}

    @ Initialize accumulator to 0
    MOVS r3, #0

    @ Initialize loop counter to 0
    MOVS r2, #0

    @ Check if N is 0
    CMP r0, #0
    BEQ done

loop:
    @ Load current element: accel_buff[r2]
    LDR r4, [r1, r2, LSL #2]    @ Load word at address (r1 + r2*4)

    @ Add to accumulator
    ADD r3, r3, r4

    @ Increment counter
    ADD r2, r2, #1

    @ Check if we've processed N elements
    CMP r2, r0
    BLT loop

done:
    @ Compute average: sum / 4
    @ Using arithmetic right shift by 2 (equivalent to divide by 4)
    ASR r0, r3, #2

    POP {r2-r11, pc}
