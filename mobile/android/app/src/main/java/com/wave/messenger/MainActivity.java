package com.wave.messenger;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WifiDirectPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
