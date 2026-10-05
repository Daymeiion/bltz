"use client";

import { useState } from "react";

export function IntegrationSettings() {
  const [settings, setSettings] = useState({
    // Social Media Integrations
    twitterEnabled: false,
    twitterApiKey: "",
    twitterApiSecret: "",
    facebookEnabled: false,
    facebookAppId: "",
    facebookAppSecret: "",
    instagramEnabled: false,
    instagramClientId: "",
    instagramClientSecret: "",
    youtubeEnabled: false,
    youtubeApiKey: "",
    tiktokEnabled: false,
    tiktokClientKey: "",
    tiktokClientSecret: "",
    
    // Payment Integrations
    stripeEnabled: false,
    stripePublishableKey: "",
    stripeSecretKey: "",
    paypalEnabled: false,
    paypalClientId: "",
    paypalClientSecret: "",
    
    // Analytics Integrations
    googleAnalyticsEnabled: false,
    googleAnalyticsId: "",
    mixpanelEnabled: false,
    mixpanelToken: "",
    amplitudeEnabled: false,
    amplitudeApiKey: "",
    
    // Communication Integrations
    sendgridEnabled: false,
    sendgridApiKey: "",
    twilioEnabled: false,
    twilioAccountSid: "",
    twilioAuthToken: "",
    slackEnabled: false,
    slackWebhookUrl: "",
    
    // Storage Integrations
    awsS3Enabled: false,
    awsAccessKeyId: "",
    awsSecretAccessKey: "",
    awsBucketName: "",
    cloudinaryEnabled: false,
    cloudinaryCloudName: "",
    cloudinaryApiKey: "",
    cloudinaryApiSecret: "",
    
    // AI/ML Integrations
    openaiEnabled: false,
    openaiApiKey: "",
    moderationApiEnabled: false,
    moderationApiKey: "",
    imageRecognitionEnabled: false,
    imageRecognitionApiKey: "",
  });

  const handleSave = () => {
    console.log("Saving integration settings:", settings);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Integration Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Social Media Integrations */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Social Media</h3>
          
          {/* Twitter */}
          <div className="space-y-3 p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.twitterEnabled}
                onChange={(e) => setSettings({...settings, twitterEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm font-medium text-white">Twitter</span>
            </div>
            {settings.twitterEnabled && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Twitter API Key"
                  value={settings.twitterApiKey}
                  onChange={(e) => setSettings({...settings, twitterApiKey: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
                <input
                  type="password"
                  placeholder="Twitter API Secret"
                  value={settings.twitterApiSecret}
                  onChange={(e) => setSettings({...settings, twitterApiSecret: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
              </div>
            )}
          </div>

          {/* Facebook */}
          <div className="space-y-3 p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.facebookEnabled}
                onChange={(e) => setSettings({...settings, facebookEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm font-medium text-white">Facebook</span>
            </div>
            {settings.facebookEnabled && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Facebook App ID"
                  value={settings.facebookAppId}
                  onChange={(e) => setSettings({...settings, facebookAppId: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
                <input
                  type="password"
                  placeholder="Facebook App Secret"
                  value={settings.facebookAppSecret}
                  onChange={(e) => setSettings({...settings, facebookAppSecret: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
              </div>
            )}
          </div>

          {/* Instagram */}
          <div className="space-y-3 p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.instagramEnabled}
                onChange={(e) => setSettings({...settings, instagramEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm font-medium text-white">Instagram</span>
            </div>
            {settings.instagramEnabled && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Instagram Client ID"
                  value={settings.instagramClientId}
                  onChange={(e) => setSettings({...settings, instagramClientId: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
                <input
                  type="password"
                  placeholder="Instagram Client Secret"
                  value={settings.instagramClientSecret}
                  onChange={(e) => setSettings({...settings, instagramClientSecret: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Payment Integrations */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Payment Processing</h3>
          
          {/* Stripe */}
          <div className="space-y-3 p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.stripeEnabled}
                onChange={(e) => setSettings({...settings, stripeEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm font-medium text-white">Stripe</span>
            </div>
            {settings.stripeEnabled && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Stripe Publishable Key"
                  value={settings.stripePublishableKey}
                  onChange={(e) => setSettings({...settings, stripePublishableKey: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
                <input
                  type="password"
                  placeholder="Stripe Secret Key"
                  value={settings.stripeSecretKey}
                  onChange={(e) => setSettings({...settings, stripeSecretKey: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
              </div>
            )}
          </div>

          {/* PayPal */}
          <div className="space-y-3 p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.paypalEnabled}
                onChange={(e) => setSettings({...settings, paypalEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm font-medium text-white">PayPal</span>
            </div>
            {settings.paypalEnabled && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="PayPal Client ID"
                  value={settings.paypalClientId}
                  onChange={(e) => setSettings({...settings, paypalClientId: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
                <input
                  type="password"
                  placeholder="PayPal Client Secret"
                  value={settings.paypalClientSecret}
                  onChange={(e) => setSettings({...settings, paypalClientSecret: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Analytics Integrations */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Analytics</h3>
          
          {/* Google Analytics */}
          <div className="space-y-3 p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.googleAnalyticsEnabled}
                onChange={(e) => setSettings({...settings, googleAnalyticsEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm font-medium text-white">Google Analytics</span>
            </div>
            {settings.googleAnalyticsEnabled && (
              <input
                type="text"
                placeholder="Google Analytics ID"
                value={settings.googleAnalyticsId}
                onChange={(e) => setSettings({...settings, googleAnalyticsId: e.target.value})}
                className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
              />
            )}
          </div>

          {/* Mixpanel */}
          <div className="space-y-3 p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.mixpanelEnabled}
                onChange={(e) => setSettings({...settings, mixpanelEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm font-medium text-white">Mixpanel</span>
            </div>
            {settings.mixpanelEnabled && (
              <input
                type="text"
                placeholder="Mixpanel Token"
                value={settings.mixpanelToken}
                onChange={(e) => setSettings({...settings, mixpanelToken: e.target.value})}
                className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
              />
            )}
          </div>
        </div>

        {/* Communication Integrations */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Communication</h3>
          
          {/* SendGrid */}
          <div className="space-y-3 p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.sendgridEnabled}
                onChange={(e) => setSettings({...settings, sendgridEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm font-medium text-white">SendGrid</span>
            </div>
            {settings.sendgridEnabled && (
              <input
                type="password"
                placeholder="SendGrid API Key"
                value={settings.sendgridApiKey}
                onChange={(e) => setSettings({...settings, sendgridApiKey: e.target.value})}
                className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
              />
            )}
          </div>

          {/* Twilio */}
          <div className="space-y-3 p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.twilioEnabled}
                onChange={(e) => setSettings({...settings, twilioEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm font-medium text-white">Twilio</span>
            </div>
            {settings.twilioEnabled && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Twilio Account SID"
                  value={settings.twilioAccountSid}
                  onChange={(e) => setSettings({...settings, twilioAccountSid: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
                <input
                  type="password"
                  placeholder="Twilio Auth Token"
                  value={settings.twilioAuthToken}
                  onChange={(e) => setSettings({...settings, twilioAuthToken: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Storage Integrations */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Storage</h3>
          
          {/* AWS S3 */}
          <div className="space-y-3 p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.awsS3Enabled}
                onChange={(e) => setSettings({...settings, awsS3Enabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm font-medium text-white">AWS S3</span>
            </div>
            {settings.awsS3Enabled && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="AWS Access Key ID"
                  value={settings.awsAccessKeyId}
                  onChange={(e) => setSettings({...settings, awsAccessKeyId: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
                <input
                  type="password"
                  placeholder="AWS Secret Access Key"
                  value={settings.awsSecretAccessKey}
                  onChange={(e) => setSettings({...settings, awsSecretAccessKey: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
                <input
                  type="text"
                  placeholder="S3 Bucket Name"
                  value={settings.awsBucketName}
                  onChange={(e) => setSettings({...settings, awsBucketName: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
              </div>
            )}
          </div>

          {/* Cloudinary */}
          <div className="space-y-3 p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.cloudinaryEnabled}
                onChange={(e) => setSettings({...settings, cloudinaryEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm font-medium text-white">Cloudinary</span>
            </div>
            {settings.cloudinaryEnabled && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Cloudinary Cloud Name"
                  value={settings.cloudinaryCloudName}
                  onChange={(e) => setSettings({...settings, cloudinaryCloudName: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
                <input
                  type="text"
                  placeholder="Cloudinary API Key"
                  value={settings.cloudinaryApiKey}
                  onChange={(e) => setSettings({...settings, cloudinaryApiKey: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
                <input
                  type="password"
                  placeholder="Cloudinary API Secret"
                  value={settings.cloudinaryApiSecret}
                  onChange={(e) => setSettings({...settings, cloudinaryApiSecret: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                />
              </div>
            )}
          </div>
        </div>

        {/* AI/ML Integrations */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">AI/ML Services</h3>
          
          {/* OpenAI */}
          <div className="space-y-3 p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.openaiEnabled}
                onChange={(e) => setSettings({...settings, openaiEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm font-medium text-white">OpenAI</span>
            </div>
            {settings.openaiEnabled && (
              <input
                type="password"
                placeholder="OpenAI API Key"
                value={settings.openaiApiKey}
                onChange={(e) => setSettings({...settings, openaiApiKey: e.target.value})}
                className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
              />
            )}
          </div>

          {/* Moderation API */}
          <div className="space-y-3 p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.moderationApiEnabled}
                onChange={(e) => setSettings({...settings, moderationApiEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm font-medium text-white">Content Moderation API</span>
            </div>
            {settings.moderationApiEnabled && (
              <input
                type="password"
                placeholder="Moderation API Key"
                value={settings.moderationApiKey}
                onChange={(e) => setSettings({...settings, moderationApiKey: e.target.value})}
                className="w-full bg-neutral-700 border border-neutral-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
              />
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-neutral-800">
        <button
          onClick={handleSave}
          className="bg-[#000CF5] text-white px-6 py-2 rounded-md hover:bg-[#000CF5]/80 transition-colors"
        >
          Save Integration Settings
        </button>
      </div>
    </div>
  );
}
