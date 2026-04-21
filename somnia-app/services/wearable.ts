import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';

const { SomniaWearable } = NativeModules;

export type DeviceType = 'bracelet' | 'ring';

export interface ScannedDevice {
  name: string;
  address: string;
  rssi: number;
}

export interface ConnectionEvent {
  status: 'connecting' | 'connected' | 'disconnected';
  deviceType: DeviceType;
  address?: string;
  name?: string;
}

export interface WearableData {
  deviceType: DeviceType;
  [key: string]: string;
}

const emitter = Platform.OS === 'android' && SomniaWearable
  ? new NativeEventEmitter(SomniaWearable)
  : null;

async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const sdk = parseInt(String((Platform as any).Version), 10);

  if (sdk >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(results).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
  } else {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
}

export function onDeviceFound(callback: (device: ScannedDevice) => void) {
  return emitter?.addListener('onDeviceFound', callback);
}

export function onConnectionChanged(callback: (event: ConnectionEvent) => void) {
  return emitter?.addListener('onConnectionChanged', callback);
}

export function onDataReceived(callback: (data: WearableData) => void) {
  return emitter?.addListener('onDataReceived', callback);
}

export async function startScan(): Promise<void> {
  if (Platform.OS !== 'android' || !SomniaWearable) return;
  const granted = await requestBluetoothPermissions();
  if (!granted) throw new Error('Bluetooth permissions denied');
  return SomniaWearable.startScan();
}

export async function stopScan(): Promise<void> {
  if (Platform.OS !== 'android' || !SomniaWearable) return;
  return SomniaWearable.stopScan();
}

export async function connectBracelet(macAddress: string): Promise<void> {
  if (Platform.OS !== 'android' || !SomniaWearable) return;
  return SomniaWearable.connectBracelet(macAddress);
}

export async function connectRing(macAddress: string): Promise<void> {
  if (Platform.OS !== 'android' || !SomniaWearable) return;
  return SomniaWearable.connectRing(macAddress);
}

export async function disconnect(): Promise<void> {
  if (Platform.OS !== 'android' || !SomniaWearable) return;
  return SomniaWearable.disconnect();
}

export async function syncSleepData(): Promise<void> {
  if (Platform.OS !== 'android' || !SomniaWearable) return;
  return SomniaWearable.syncSleepData();
}

export async function syncHeartRateData(): Promise<void> {
  if (Platform.OS !== 'android' || !SomniaWearable) return;
  return SomniaWearable.syncHeartRateData();
}

export async function syncHrvData(): Promise<void> {
  if (Platform.OS !== 'android' || !SomniaWearable) return;
  return SomniaWearable.syncHrvData();
}

export async function syncBloodOxygenData(): Promise<void> {
  if (Platform.OS !== 'android' || !SomniaWearable) return;
  return SomniaWearable.syncBloodOxygenData();
}

export async function getBatteryLevel(): Promise<void> {
  if (Platform.OS !== 'android' || !SomniaWearable) return;
  return SomniaWearable.getBatteryLevel();
}

export async function syncTime(): Promise<void> {
  if (Platform.OS !== 'android' || !SomniaWearable) return;
  return SomniaWearable.syncTime();
}

export async function syncAllData(): Promise<void> {
  await syncSleepData();
  await new Promise(r => setTimeout(r, 500));
  await syncHeartRateData();
  await new Promise(r => setTimeout(r, 500));
  await syncHrvData();
  await new Promise(r => setTimeout(r, 500));
  await syncBloodOxygenData();
}

export const isAvailable = Platform.OS === 'android' && !!SomniaWearable;
