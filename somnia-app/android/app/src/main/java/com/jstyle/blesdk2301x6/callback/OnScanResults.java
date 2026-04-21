package com.jstyle.blesdk2301x6.callback;


import com.jstyle.blesdk2301x6.model.Device;

public interface OnScanResults {
  void Success(Device date);
  void Fail(int code);
}
