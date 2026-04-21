package com.jstyle.blesdk2301x6.constant;

/**
 * Created by Administrator on 2018/1/17.
 */

public class DeviceConst {
    public static final byte CMD_SET_TIME = (byte)0x01;
    public static final byte CMD_GET_TIME = (byte)0x41;
    public static final byte CMD_Set_UseInfo = (byte)0x02;
    public static final byte CMD_GET_USERINFO =  (byte) 0x42;
    public static final byte CMD_Set_DeviceID = (byte)0x05;
    public static final byte CMD_Enable_Activity = (byte)0x09;//
    public static final byte CMD_Get_BatteryLevel = (byte)0x13;//
    public static final byte CMD_Get_Address = (byte)0x22;
    public static final byte CMD_Get_Version = (byte)0x27;
    public static final byte CMD_Reset = (byte)0x12;
    public static final byte CMD_Mcu_Reset = (byte)0x2e;
    public static final byte CMD_Set_Auto = (byte)0x2a;
    public static final byte CMD_Get_Auto = (byte)0x2b;
    public static final byte CMD_Get_TotalData = (byte)0x51;//
    public static final byte CMD_Get_DetailData = (byte)0x52;
    public static final byte CMD_Get_SleepData = (byte)0x53;
    public static final byte CMD_Get_HeartData = (byte)0x54;
    public static final byte CMD_Get_OnceHeartData = (byte)0x55;
    public static final byte CMD_Get_HrvTestData = (byte)0x56;//
    public static final byte ReadTempHisrory= (byte)0x62;
    public static final byte MeasurementWithType= (byte)0x28;
    public static final byte Oxygen_data= (byte)0x66;

    public static final byte CMD_Start_EXERCISE = (byte)0x19;
    public static final byte CMD_heart_package= (byte)0x17;
    public static final byte CMD_HeartPackageFromDevice = (byte)0x18;//
    public static final byte CMD_Set_Name = (byte)0x3d;
    public static final byte CMD_Get_Name = (byte)0x3e;

    public static final byte CMD_Get_SPORTData = (byte)0x5C;

    public static final byte CMD_Get_Bloodsugar = (byte)0x78;
    public static final byte Bloodsugar_data=(byte)0x3a;//血糖数据
}
