import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';

export type NotificationPrefs = {
  announcements: boolean;
  events: boolean;
  articles: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  announcements: true,
  events: true,
  articles: true,
};

const prefsKey = (userId: string) => `notif:prefs:${userId}`;

export function configureNotifications() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => {
        const behavior: any = {
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        };
        // Some Expo Go/runtime combinations still read shouldShowAlert.
        behavior.shouldShowAlert = true;
        return behavior;
      },
    });
  } catch {
    // No-op in runtimes where notifications are not fully supported.
  }
}

export async function loadNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(prefsKey(userId));
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      announcements: parsed.announcements ?? true,
      events: parsed.events ?? true,
      articles: parsed.articles ?? true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveNotificationPrefs(userId: string, prefs: NotificationPrefs) {
  await AsyncStorage.setItem(prefsKey(userId), JSON.stringify(prefs));

  // Best effort sync. This will no-op safely if table is not present yet.
  try {
    await supabase
      .from('user_notification_preferences')
      .upsert(
        {
          user_id: userId,
          announcements_enabled: prefs.announcements,
          events_enabled: prefs.events,
          articles_enabled: prefs.articles,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
  } catch {
    // Intentionally ignore sync failures to keep settings usable locally.
  }
}

export async function registerPushToken(userId: string): Promise<string | null> {
  try {
    // Expo Go does not fully support remote push; skip to avoid runtime errors.
    if (Constants.appOwnership === 'expo') return null;

    if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    if (!Device.isDevice) return null;

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;

    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      undefined;

    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;

    // Best effort sync. This will no-op safely if table is not present yet.
    try {
      await supabase
        .from('user_push_tokens')
        .upsert(
          {
            user_id: userId,
            expo_push_token: token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
    } catch {
      // Ignore table/policy errors for now.
    }

    return token;
  } catch {
    return null;
  }
}
