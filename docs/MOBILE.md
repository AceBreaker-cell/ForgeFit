# Use ForgeFit from your phone

The Java backend runs on your Windows/Linux computer or server. Your Android or iOS device opens its responsive browser interface. Closing or sleeping the host PC makes that local server unavailable.

## On the same trusted Wi-Fi

1. Build the app, then stop any copy already running on port 8080.
2. Start it from the project root with LAN access:

   ```powershell
   java -jar target\forgefit.jar --server.address=0.0.0.0
   ```

   Linux uses `target/forgefit.jar`. The downloadable binary can be run with `runtime/forgefit.jar` instead.

3. On Windows, run `ipconfig` and find the Wi-Fi adapter’s IPv4 address (for example `192.168.1.25`). On Linux, `hostname -I` lists addresses.
4. Allow inbound Java/TCP 8080 on the Windows **Private network** profile if the firewall asks. Use a trusted network; do not expose this port by configuring router port forwarding.
5. On the phone, open `http://192.168.1.25:8080`, replacing the sample address with the PC’s actual address.
6. Create or sign into your account. The phone and desktop use the same server-side database, so saved sessions are shared.

In IntelliJ, the same setting can be supplied as the program argument `--server.address=0.0.0.0` or environment variable `SERVER_ADDRESS=0.0.0.0` in the run configuration.

`localhost` on your phone means the phone itself, not your PC. Guest Wi-Fi often blocks connections between devices. An HTTP LAN test is appropriate for disposable test credentials; use HTTPS for real accounts across a network.

## Install on the home screen

Use a trusted **HTTPS** deployment for installation and service-worker support on a phone. The `localhost` development exception applies to the same device, not to an ordinary LAN IP address. Do not bypass certificate warnings.

- Android: open the HTTPS site in a supporting browser, then use **Install app** or **Add to Home Screen**. Exact menu names vary by browser.
- iPhone/iPad: open the HTTPS site in Safari, use **Share → Add to Home Screen**, and enable **Open as Web App** if offered.

Installation does not embed a Java backend in the phone and does not create an APK/IPA. It gives the web interface its own home-screen icon/window. There are no push notifications, health-platform integrations, or background workout synchronization in this release.

## Offline behavior

Training records require a connection. The app displays an offline message if the server cannot be reached; it does not silently accept or queue failed saves. An unfinished session survives a refresh in the same tab through session storage, but closing the tab or explicitly signing out clears it. Finish and save while connected.

## Before a portfolio demo

Check that the host PC is awake, the phone and PC share a network, and the browser can open the app. Use a demo account, add the sample records, and show the dashboard, workout logger, and progress page. Physical Android/iOS testing is still recommended before claiming support for a particular device/browser combination.
