package com.wave.messenger;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.wifi.p2p.*;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@CapacitorPlugin(name = "WifiDirect")
public class WifiDirectPlugin extends Plugin {

    private static final String TAG = "WifiDirectPlugin";
    private WifiP2pManager manager;
    private WifiP2pManager.Channel channel;
    private BroadcastReceiver receiver;
    private final IntentFilter intentFilter = new IntentFilter();
    private boolean isDiscovering = false;

    @Override
    public void load() {
        manager = (WifiP2pManager) getActivity().getSystemService(Context.WIFI_P2P_SERVICE);
        channel = manager.initialize(getActivity(), Looper.getMainLooper(), null);

        intentFilter.addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION);
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION);
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION);
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION);

        receiver = new WifiDirectBroadcastReceiver(manager, channel, this);
        getActivity().registerReceiver(receiver, intentFilter);
    }

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (manager == null) {
            call.reject("WiFi Direct not supported");
            return;
        }
        manager.discoverPeers(channel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() {
                isDiscovering = true;
                call.resolve();
            }
            @Override
            public void onFailure(int reason) {
                call.reject("Discovery failed: " + reason);
            }
        });
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        if (manager == null) { call.resolve(); return; }
        manager.stopPeerDiscovery(channel, new WifiP2pManager.ActionListener() {
            @Override public void onSuccess() { isDiscovering = false; call.resolve(); }
            @Override public void onFailure(int reason) { call.resolve(); }
        });
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String deviceAddress = call.getString("address");
        if (deviceAddress == null) { call.reject("address required"); return; }

        WifiP2pConfig config = new WifiP2pConfig();
        config.deviceAddress = deviceAddress;
        config.wps.setup = android.net.wifi.WpsInfo.PBC;

        manager.connect(channel, config, new WifiP2pManager.ActionListener() {
            @Override public void onSuccess() { call.resolve(); }
            @Override public void onFailure(int reason) { call.reject("Connect failed: " + reason); }
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        if (manager == null) { call.resolve(); return; }
        manager.removeGroup(channel, new WifiP2pManager.ActionListener() {
            @Override public void onSuccess() { call.resolve(); }
            @Override public void onFailure(int reason) { call.resolve(); }
        });
    }

    public void notifyPeersChanged(List<WifiP2pDevice> devices) {
        try {
            JSONArray arr = new JSONArray();
            for (WifiP2pDevice d : devices) {
                JSONObject obj = new JSONObject();
                obj.put("name", d.deviceName);
                obj.put("address", d.deviceAddress);
                obj.put("status", d.status);
                arr.put(obj);
            }
            JSObject data = new JSObject();
            data.put("peers", arr.toString());
            notifyListeners("peersChanged", data);
        } catch (Exception e) {
            Log.e(TAG, "notifyPeersChanged error", e);
        }
    }

    public void notifyConnectionChanged(boolean connected, String groupOwnerAddress) {
        JSObject data = new JSObject();
        data.put("connected", connected);
        data.put("groupOwnerAddress", groupOwnerAddress != null ? groupOwnerAddress : "");
        notifyListeners("connectionChanged", data);
    }

    @Override
    protected void handleOnDestroy() {
        try { getActivity().unregisterReceiver(receiver); } catch (Exception ignored) {}
    }

    private static class WifiDirectBroadcastReceiver extends BroadcastReceiver {
        private final WifiP2pManager manager;
        private final WifiP2pManager.Channel channel;
        private final WifiDirectPlugin plugin;

        WifiDirectBroadcastReceiver(WifiP2pManager manager, WifiP2pManager.Channel channel, WifiDirectPlugin plugin) {
            this.manager = manager;
            this.channel = channel;
            this.plugin = plugin;
        }

        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION.equals(action)) {
                manager.requestPeers(channel, peerList -> {
                    Collection<WifiP2pDevice> peers = peerList.getDeviceList();
                    plugin.notifyPeersChanged(new ArrayList<>(peers));
                });
            } else if (WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION.equals(action)) {
                android.net.NetworkInfo networkInfo = intent.getParcelableExtra(WifiP2pManager.EXTRA_NETWORK_INFO);
                if (networkInfo != null && networkInfo.isConnected()) {
                    manager.requestConnectionInfo(channel, info -> {
                        String addr = info.groupOwnerAddress != null ? info.groupOwnerAddress.getHostAddress() : null;
                        plugin.notifyConnectionChanged(true, addr);
                    });
                } else {
                    plugin.notifyConnectionChanged(false, null);
                }
            }
        }
    }
}
