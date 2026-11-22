package com.popov_ds.sutra.ads

import android.util.Log
import android.view.ViewTreeObserver
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.yandex.mobile.ads.banner.BannerAdEventListener
import com.yandex.mobile.ads.banner.BannerAdSize
import com.yandex.mobile.ads.banner.BannerAdView
import com.yandex.mobile.ads.common.AdRequest
import com.yandex.mobile.ads.common.AdRequestError
import com.yandex.mobile.ads.common.ImpressionData

private const val LOG_TAG = "YandexBannerView"
private const val PROP_AD_UNIT_ID = "adUnitId"
private const val EVENT_AD_LOADED = "topAdLoaded"
private const val TAG_KEY_LOADED_UNIT = 0x71000001

class YandexBannerViewManager : SimpleViewManager<BannerAdView>() {
  override fun getName(): String = "YandexBannerView"

  override fun createViewInstance(reactContext: ThemedReactContext): BannerAdView {
    return BannerAdView(reactContext)
  }

  override fun onDropViewInstance(view: BannerAdView) {
    view.destroy()
    super.onDropViewInstance(view)
  }

  @ReactProp(name = PROP_AD_UNIT_ID)
  fun setAdUnitId(view: BannerAdView, adUnitId: String?) {
    if (adUnitId.isNullOrBlank()) return
    val loaded = view.getTag(TAG_KEY_LOADED_UNIT) as? String
    if (loaded == adUnitId) return
    view.setTag(TAG_KEY_LOADED_UNIT, adUnitId)
    attachLoadAfterLayout(view, adUnitId)
  }

  private fun attachLoadAfterLayout(view: BannerAdView, adUnitId: String) {
    val load = Runnable { loadBanner(view, adUnitId) }
    if (view.width > 0) {
      load.run()
      return
    }
    view.viewTreeObserver.addOnGlobalLayoutListener(
      object : ViewTreeObserver.OnGlobalLayoutListener {
        override fun onGlobalLayout() {
          if (view.width <= 0) return
          view.viewTreeObserver.removeOnGlobalLayoutListener(this)
          load.run()
        }
      },
    )
  }

  private fun loadBanner(view: BannerAdView, adUnitId: String) {
    val widthPx = view.width
    if (widthPx <= 0) return
    val widthDp = (widthPx / view.resources.displayMetrics.density).toInt().coerceAtLeast(320)

    view.setAdUnitId(adUnitId)
    view.setAdSize(BannerAdSize.sticky(view.context, widthDp))
    view.setBannerAdEventListener(
      object : BannerAdEventListener {
        override fun onAdLoaded() {
          val h = view.height
          Log.d(LOG_TAG, "onAdLoaded unit=$adUnitId heightPx=$h widthDp=$widthDp")
          emitAdLoaded(view, adUnitId, h)
        }

        override fun onAdFailedToLoad(error: AdRequestError) {
          Log.w(LOG_TAG, "onAdFailedToLoad unit=$adUnitId code=${error.code} desc=${error.description}")
        }

        override fun onAdClicked() {}

        override fun onImpression(impressionData: ImpressionData?) {}
      },
    )
    view.loadAd(AdRequest.Builder(adUnitId).build())
  }

  private fun emitAdLoaded(view: BannerAdView, adUnitId: String, heightPx: Int) {
    val reactContext = view.context as? ReactContext ?: return
    val payload = Arguments.createMap().apply {
      putString("adUnitId", adUnitId)
      putInt("heightPx", heightPx)
    }
    reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(view.id, EVENT_AD_LOADED, payload)
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    mapOf(EVENT_AD_LOADED to mapOf("registrationName" to "onAdLoaded"))
}