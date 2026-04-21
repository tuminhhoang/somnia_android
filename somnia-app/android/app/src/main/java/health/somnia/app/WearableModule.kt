package health.somnia.app

import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.jstyle.blesdk2208a.Util.BleSDK as BleSDK2208
import com.jstyle.blesdk2208a.callback.DataListener2025
import com.jstyle.blesdk2208a.model.MyDeviceTime as DeviceTime2208
import com.jstyle.blesdk2301x6.Util.BleSDK as BleSDK2301
import com.jstyle.blesdk2301x6.callback.DataListener2301
import com.jstyle.blesdk2301x6.model.MyDeviceTime as DeviceTime2301
import java.util.*

class WearableModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "SomniaWearable"
        private val SERVICE_UUID = UUID.fromString("0000fff0-0000-1000-8000-00805f9b34fb")
        private val WRITE_UUID = UUID.fromString("0000fff6-0000-1000-8000-00805f9b34fb")
        private val NOTIFY_UUID = UUID.fromString("0000fff7-0000-1000-8000-00805f9b34fb")
        private val CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
        private val MODE_START = 0.toByte()
    }

    override fun getName() = "SomniaWearable"

    private val mainHandler = Handler(Looper.getMainLooper())
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothGatt: BluetoothGatt? = null
    private var currentDeviceType: String = ""
    private var isConnected = false
    private val writeQueue: Queue<ByteArray> = LinkedList()

    private fun getBluetoothAdapter(): BluetoothAdapter? {
        if (bluetoothAdapter == null) {
            val manager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            bluetoothAdapter = manager?.adapter
        }
        return bluetoothAdapter
    }

    private fun emit(event: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, params)
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun startScan(promise: Promise) {
        val adapter = getBluetoothAdapter()
        if (adapter == null || !adapter.isEnabled) {
            promise.reject("BT_DISABLED", "Bluetooth is not enabled")
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            adapter.bluetoothLeScanner?.startScan(leScanCallback)
        } else {
            @Suppress("DEPRECATION")
            adapter.startLeScan(legacyScanCallback)
        }
        mainHandler.postDelayed({ stopScanInternal() }, 15000)
        promise.resolve(null)
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun stopScan(promise: Promise) {
        stopScanInternal()
        promise.resolve(null)
    }

    @SuppressLint("MissingPermission")
    private fun stopScanInternal() {
        val adapter = getBluetoothAdapter() ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            adapter.bluetoothLeScanner?.stopScan(leScanCallback)
        } else {
            @Suppress("DEPRECATION")
            adapter.stopLeScan(legacyScanCallback)
        }
    }

    @ReactMethod
    fun connectBracelet(macAddress: String, promise: Promise) {
        currentDeviceType = "bracelet"
        connectDevice(macAddress, promise)
    }

    @ReactMethod
    fun connectRing(macAddress: String, promise: Promise) {
        currentDeviceType = "ring"
        connectDevice(macAddress, promise)
    }

    @SuppressLint("MissingPermission")
    private fun connectDevice(macAddress: String, promise: Promise) {
        val adapter = getBluetoothAdapter()
        if (adapter == null || !adapter.isEnabled) {
            promise.reject("BT_DISABLED", "Bluetooth is not enabled")
            return
        }
        disconnectInternal()
        try {
            val device = adapter.getRemoteDevice(macAddress.uppercase())
            bluetoothGatt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                device.connectGatt(reactContext, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
            } else {
                device.connectGatt(reactContext, false, gattCallback)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CONNECT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        disconnectInternal()
        promise.resolve(null)
    }

    @SuppressLint("MissingPermission")
    private fun disconnectInternal() {
        bluetoothGatt?.let { it.disconnect(); it.close() }
        bluetoothGatt = null
        isConnected = false
        writeQueue.clear()
    }

    @ReactMethod
    fun syncSleepData(promise: Promise) {
        if (!isConnected) { promise.reject("NOT_CONNECTED", "Device not connected"); return }
        val cmd = if (currentDeviceType == "bracelet")
            BleSDK2208.GetDetailSleepDataWithMode(MODE_START, "")
        else
            BleSDK2301.GetDetailSleepDataWithMode(MODE_START, "")
        writeValue(cmd)
        promise.resolve(null)
    }

    @ReactMethod
    fun syncHeartRateData(promise: Promise) {
        if (!isConnected) { promise.reject("NOT_CONNECTED", "Device not connected"); return }
        val cmd = if (currentDeviceType == "bracelet")
            BleSDK2208.GetStaticHRWithMode(MODE_START, "")
        else
            BleSDK2301.GetStaticHRWithMode(MODE_START, "")
        writeValue(cmd)
        promise.resolve(null)
    }

    @ReactMethod
    fun syncHrvData(promise: Promise) {
        if (!isConnected) { promise.reject("NOT_CONNECTED", "Device not connected"); return }
        val cmd = if (currentDeviceType == "bracelet")
            BleSDK2208.GetHRVDataWithMode(MODE_START, "")
        else
            BleSDK2301.GetHRVDataWithMode(MODE_START, "")
        writeValue(cmd)
        promise.resolve(null)
    }

    @ReactMethod
    fun syncBloodOxygenData(promise: Promise) {
        if (!isConnected) { promise.reject("NOT_CONNECTED", "Device not connected"); return }
        val cmd = if (currentDeviceType == "bracelet")
            BleSDK2208.Obtain_The_data_of_manual_blood_oxygen_test(MODE_START)
        else
            BleSDK2301.Oxygen_data(MODE_START, "")
        writeValue(cmd)
        promise.resolve(null)
    }

    @ReactMethod
    fun getBatteryLevel(promise: Promise) {
        if (!isConnected) { promise.reject("NOT_CONNECTED", "Device not connected"); return }
        val cmd = if (currentDeviceType == "bracelet")
            BleSDK2208.GetDeviceBatteryLevel()
        else
            BleSDK2301.GetDeviceBatteryLevel()
        writeValue(cmd)
        promise.resolve(null)
    }

    @ReactMethod
    fun syncTime(promise: Promise) {
        if (!isConnected) { promise.reject("NOT_CONNECTED", "Device not connected"); return }
        val cal = Calendar.getInstance()
        val cmd = if (currentDeviceType == "bracelet") {
            val t = DeviceTime2208()
            t.setYear(cal.get(Calendar.YEAR))
            t.setMonth(cal.get(Calendar.MONTH) + 1)
            t.setDay(cal.get(Calendar.DAY_OF_MONTH))
            t.setHour(cal.get(Calendar.HOUR_OF_DAY))
            t.setMinute(cal.get(Calendar.MINUTE))
            t.setSecond(cal.get(Calendar.SECOND))
            BleSDK2208.SetDeviceTime(t)
        } else {
            // X3 MyDeviceTime default constructor already uses current time
            BleSDK2301.SetDeviceTime(DeviceTime2301())
        }
        writeValue(cmd)
        promise.resolve(null)
    }

    @SuppressLint("MissingPermission")
    private fun writeValue(value: ByteArray?) {
        if (value == null || bluetoothGatt == null) return
        writeQueue.offer(value)
        if (writeQueue.size == 1) processNextWrite()
    }

    @SuppressLint("MissingPermission")
    private fun processNextWrite() {
        val gatt = bluetoothGatt ?: return
        val data = writeQueue.peek() ?: return
        val service = gatt.getService(SERVICE_UUID) ?: return
        val characteristic = service.getCharacteristic(WRITE_UUID) ?: return
        characteristic.value = data
        gatt.writeCharacteristic(characteristic)
    }

    private val leScanCallback: ScanCallback = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val device = result.device
                val params = Arguments.createMap().apply {
                    putString("name", device.name ?: "Unknown")
                    putString("address", device.address)
                    putInt("rssi", result.rssi)
                }
                emit("onDeviceFound", params)
            }
        }
    } else object : ScanCallback() {}

    @Suppress("DEPRECATION")
    private val legacyScanCallback = BluetoothAdapter.LeScanCallback { device, rssi, _ ->
        val params = Arguments.createMap().apply {
            putString("name", device.name ?: "Unknown")
            putString("address", device.address)
            putInt("rssi", rssi)
        }
        emit("onDeviceFound", params)
    }

    private val gattCallback = object : BluetoothGattCallback() {
        @SuppressLint("MissingPermission")
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            val params = Arguments.createMap()
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    isConnected = false
                    gatt.discoverServices()
                    params.putString("status", "connecting")
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    isConnected = false
                    bluetoothGatt?.close()
                    bluetoothGatt = null
                    writeQueue.clear()
                    params.putString("status", "disconnected")
                }
                else -> params.putString("status", "unknown")
            }
            params.putString("deviceType", currentDeviceType)
            emit("onConnectionChanged", params)
        }

        @SuppressLint("MissingPermission")
        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) return
            val service = gatt.getService(SERVICE_UUID) ?: return
            val notifyChar = service.getCharacteristic(NOTIFY_UUID) ?: return
            gatt.setCharacteristicNotification(notifyChar, true)
            Thread.sleep(20)
            val descriptor = notifyChar.getDescriptor(CCCD_UUID) ?: return
            descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
            gatt.writeDescriptor(descriptor)
        }

        @SuppressLint("MissingPermission")
        override fun onDescriptorWrite(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                isConnected = true
                val params = Arguments.createMap().apply {
                    putString("status", "connected")
                    putString("deviceType", currentDeviceType)
                    putString("address", gatt.device.address)
                    putString("name", gatt.device.name ?: "Unknown")
                }
                emit("onConnectionChanged", params)
            }
        }

        override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            val value = characteristic.value ?: return
            parseData(value)
        }

        @SuppressLint("MissingPermission")
        override fun onCharacteristicWrite(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
            writeQueue.poll()
            if (writeQueue.isNotEmpty()) processNextWrite()
        }
    }

    private fun parseData(value: ByteArray) {
        if (currentDeviceType == "bracelet") {
            BleSDK2208.DataParsingWithData(value, object : DataListener2025 {
                override fun dataCallback(maps: Map<String, Any>) {
                    val params = Arguments.createMap()
                    maps.forEach { (k, v) -> params.putString(k, v.toString()) }
                    params.putString("deviceType", "bracelet")
                    emit("onDataReceived", params)
                }
                override fun dataCallback(bytes: ByteArray) {}
            })
        } else {
            BleSDK2301.DataParsingWithData(value, object : DataListener2301 {
                override fun dataCallback(maps: Map<String, Any>) {
                    val params = Arguments.createMap()
                    maps.forEach { (k, v) -> params.putString(k, v.toString()) }
                    params.putString("deviceType", "ring")
                    emit("onDataReceived", params)
                }
                override fun dataCallback(bytes: ByteArray) {}
            })
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
