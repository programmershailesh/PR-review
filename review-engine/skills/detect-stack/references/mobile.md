# Mobile: iOS, Android, React Native and Flutter

**Swift and iOS**: retain cycles in closures; UI updates off the main actor; blocking the main thread; force unwraps on external data; heavy work inside SwiftUI `body`.

**Android and Kotlin**: leaked `Context`; work tied to the wrong lifecycle scope; unnecessary Compose recomposition from unstable parameters; main-thread I/O.

**React Native**: `ScrollView` for long lists instead of a virtualized list; inline `renderItem` and unstable props; heavy JS-thread work during animation.

**Flutter**: `build` methods doing work; missing `const` on hot widgets; controllers not disposed; `setState` after dispose.

**All**: tokens in plain storage rather than Keychain or Keystore; no offline or retry handling; breaking API changes for app versions already installed, which cannot be force-updated.
