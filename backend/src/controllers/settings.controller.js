import { Settings } from "../models/settings.model.js";
export const SettingsController = {
  get(req,res){ return res.json(Settings.getAll()); },
  update(req,res){ return res.json(Settings.setMany(req.body || {})); }
  ,
  publicGet(req,res){
    const s = Settings.getAll();
    // Only expose safe, UI config values
    return res.json({
      shopName: s.shopName || "RoboticsLeb",
      currency: s.currency || "৳",
      siteLogoUrl: s.siteLogoUrl || "",
      starterVideoUrl: s.starterVideoUrl || "",
      starterVideoTitle: s.starterVideoTitle || "",
      deliveryDhaka: Number(s.deliveryDhaka ?? 100),
      deliveryOutside: Number(s.deliveryOutside ?? 150),
      paymentMethods: (s.paymentMethods ? String(s.paymentMethods).split(",").map(x=>x.trim()).filter(Boolean) : ["cod","bkash","nagad"]),
      bkashNumber: s.bkashNumber || "",
      nagadNumber: s.nagadNumber || "",
      rocketNumber: s.rocketNumber || "",
      paymentInstructions: s.paymentInstructions || "",

      // Footer / contact
      footerAbout: s.footerAbout || "",
      footerAddress: s.footerAddress || "",
      contactEmail: s.contactEmail || "",
      contactPhone: s.contactPhone || "",

      // Social links
      socialFacebook: s.socialFacebook || "",
      socialInstagram: s.socialInstagram || "",
      socialWhatsapp: s.socialWhatsapp || "",
      socialYoutube: s.socialYoutube || "",

      // Floating contact widget
      whatsappNumber: s.whatsappNumber || "",
      phoneNumber: s.phoneNumber || "",

      // Offer banner (site-wide)
      offerEnabled: String(s.offerEnabled || "0"),
      offerText: s.offerText || "",
      offerLink: s.offerLink || "",
      offerEndsAt: s.offerEndsAt || "",
      offerType: s.offerType || "",
      offerValue: s.offerValue || "",
      offerAppliesTo: s.offerAppliesTo || "all",
      offerAppliesKey: s.offerAppliesKey || "",
      offerAppliesLabel: s.offerAppliesLabel || "",

      // Home customization
      homeHeroTitle: s.homeHeroTitle || "",
      homeHeroSubtitle: s.homeHeroSubtitle || "",
      homeHeroPrimaryText: s.homeHeroPrimaryText || "",
      homeHeroPrimaryLink: s.homeHeroPrimaryLink || "",
      homeHeroSecondaryText: s.homeHeroSecondaryText || "",
      homeHeroSecondaryLink: s.homeHeroSecondaryLink || "",
      homeHighlightsJson: s.homeHighlightsJson || ""
    });
  }
};
