const fs = require('node:fs');
const path = require('node:path');

const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
  withProjectBuildGradle,
  withStringsXml,
} = require('@expo/config-plugins');

const SDK_VERSION = '11.2.0';
const RUSTORE_MAVEN = 'https://nexus-external.rustore.ru/repository/maven-rustore-exposed';
function ensureMavenRepo(contents) {
  if (contents.includes('maven-rustore-exposed')) return contents;
  return contents.replace(
    /maven\s*\{\s*url\s*['"]https:\/\/www\.jitpack\.io['"]\s*\}/,
    (match) => `${match}\n    maven { url = uri("${RUSTORE_MAVEN}") }`,
  );
}

function ensurePayDependency(contents) {
  if (contents.includes('rustore.sdk-wrapper.react-native:pay')) return contents;
  return contents.replace(
    /dependencies\s*\{/,
    `dependencies {\n    implementation("ru.rustore.sdk-wrapper.react-native:pay:${SDK_VERSION}")`,
  );
}

function withRuStorePayGradle(config) {
  config = withProjectBuildGradle(config, (mod) => {
    mod.modResults.contents = ensureMavenRepo(mod.modResults.contents);
    return mod;
  });
  config = withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = ensurePayDependency(mod.modResults.contents);
    return mod;
  });
  return config;
}

function withRuStorePayManifest(config, { scheme, consoleAppId }) {
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (!app) return mod;

    const meta = app['meta-data'] ?? [];
    const upsert = (name, value) => {
      const existing = meta.find((m) => m.$['android:name'] === name);
      if (existing) {
        existing.$['android:value'] = value;
        return;
      }
      meta.push({ $: { 'android:name': name, 'android:value': value } });
    };

    if (consoleAppId) {
      upsert('console_app_id_value', '@string/rustore_console_app_id');
    }
    upsert('sdk_pay_scheme_value', scheme);

    app['meta-data'] = meta;

    if (!app.activity) return mod;
    const main = app.activity.find((activity) =>
      activity['intent-filter']?.some((filter) =>
        filter.action?.some((action) => action.$['android:name'] === 'android.intent.action.MAIN'),
      ),
    );
    if (!main) return mod;

  const filters = main['intent-filter'] ?? [];
  const hasRuStoreReturn = filters.some((filter) =>
    filter.data?.some((data) => data.$['android:scheme'] === 'rustore'),
  );
  if (!hasRuStoreReturn) {
    filters.push({
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      category: [
        { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
      ],
      data: [{ $: { 'android:scheme': 'rustore' } }],
    });
  }
    main['intent-filter'] = filters;

    const payActivityName = 'ru.rustore.sdk.pay.internal.presentation.ui.PayActivity';
    const hasPayActivity = app.activity.some((a) => a.$['android:name'] === payActivityName);
    if (!hasPayActivity) {
      app.activity.push({
        $: {
          'android:name': payActivityName,
          'android:exported': 'false',
          'android:launchMode': 'singleTask',
          'tools:replace': 'android:launchMode',
        },
      });
    }

    return mod;
  });
}

function withRuStoreConsoleString(config, consoleAppId) {
  if (!consoleAppId) return config;
  return withStringsXml(config, (mod) => {
    mod.modResults.resources.string = mod.modResults.resources.string ?? [];
    const strings = mod.modResults.resources.string;
    const existing = strings.find((item) => item.$.name === 'rustore_console_app_id');
    if (existing) existing._ = consoleAppId;
    else strings.push({ $: { name: 'rustore_console_app_id' }, _: consoleAppId });
    return mod;
  });
}

function withRuStoreLegacyArch(config) {
  return withGradleProperties(config, (mod) => {
    const props = mod.modResults;
    const entry = props.find((item) => item.type === 'property' && item.key === 'newArchEnabled');
    if (entry) entry.value = 'false';
    else props.push({ type: 'property', key: 'newArchEnabled', value: 'false' });
    return mod;
  });
}

function patchMainApplication(projectRoot) {
  const ktPath = path.join(
    projectRoot,
    'android',
    'app',
    'src',
    'main',
    'java',
    'com',
    'popov_ds',
    'sutra',
    'MainApplication.kt',
  );
  if (!fs.existsSync(ktPath)) return;

  let src = fs.readFileSync(ktPath, 'utf8');
  if (!src.includes('RuStoreReactPayPackage')) {
    src = src.replace(
      'import com.popov_ds.sutra.ads.YandexAdsPackage',
      'import com.popov_ds.sutra.ads.YandexAdsPackage\nimport ru.rustore.react.pay.RuStoreReactPayPackage',
    );
    src = src.replace(
      'add(YandexAdsPackage())',
      'add(YandexAdsPackage())\n          add(RuStoreReactPayPackage())',
    );
  }
  fs.writeFileSync(ktPath, src);
}

function patchMainActivity(projectRoot) {
  const ktPath = path.join(
    projectRoot,
    'android',
    'app',
    'src',
    'main',
    'java',
    'com',
    'popov_ds',
    'sutra',
    'MainActivity.kt',
  );
  if (!fs.existsSync(ktPath)) return;

  let src = fs.readFileSync(ktPath, 'utf8');
  if (src.includes('RuStoreReactPayModule')) return;

  src = src.replace(
    'import android.os.Build\nimport android.os.Bundle',
    'import android.content.Intent\nimport android.os.Build\nimport android.os.Bundle',
  );
  src = src.replace(
    'import expo.modules.ReactActivityDelegateWrapper',
    'import expo.modules.ReactActivityDelegateWrapper\nimport ru.rustore.react.pay.RuStoreReactPayModule',
  );

  if (!src.includes('handleRuStorePayIntent')) {
    src = src.replace(
      'class MainActivity : ReactActivity() {\n  override fun onCreate(savedInstanceState: Bundle?) {',
      `class MainActivity : ReactActivity() {
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    intent?.let { RuStoreReactPayModule.processIntent(it) }
  }

  private fun handleRuStorePayIntent(intent: Intent?) {
    intent?.let { RuStoreReactPayModule.processIntent(it) }
  }

  override fun onCreate(savedInstanceState: Bundle?) {`,
    );
    src = src.replace('super.onCreate(null)', 'super.onCreate(null)\n    handleRuStorePayIntent(intent)');
  }

  fs.writeFileSync(ktPath, src);
}

function withRuStoreNativeRegistration(config) {
  return withDangerousMod(config, [
    'android',
    (mod) => {
      patchMainApplication(mod.modRequest.projectRoot);
      patchMainActivity(mod.modRequest.projectRoot);
      return mod;
    },
  ]);
}

module.exports = function withRustorePay(config, props = {}) {
  const scheme = config.scheme ?? props.deeplinkScheme ?? 'sutra';
  const consoleAppId = props.consoleAppId ?? process.env.EXPO_PUBLIC_RUSTORE_CONSOLE_APP_ID ?? '';

  config = withRuStorePayGradle(config);
  config = withRuStoreLegacyArch(config);
  config = withRuStoreConsoleString(config, consoleAppId);
  config = withRuStorePayManifest(config, { scheme, consoleAppId });
  config = withRuStoreNativeRegistration(config);

  return config;
};