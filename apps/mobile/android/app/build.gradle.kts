plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.bizlink.emaintenance.mobile"
    compileSdk = 36

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        applicationId = "com.bizlink.emaintenance.mobile"
        minSdk = 21
        targetSdk = 36
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            // For development/testing - use debug keystore
            // In production, replace with proper keystore:
            // keyAlias = "your-key-alias"
            // keyPassword = "your-key-password"
            // storeFile = file("path/to/your/keystore.jks")
            // storePassword = "your-store-password"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
            storeFile = file("${System.getProperty("user.home")}/.android/debug.keystore")
            storePassword = "android"
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

flutter {
    source = "../.."
}
