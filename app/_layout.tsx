import FontAwesome from "@expo/vector-icons/FontAwesome"
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native"
import { useFonts } from "expo-font"
import { Link, Stack, Tabs } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import React, { useEffect, useState } from "react"
import { supabase } from "@/utils/supabase"

import { useColorScheme } from "@/components/useColorScheme"
import { Session } from "@supabase/supabase-js"

import { router } from "expo-router"

export {
	// Catch any errors thrown by the Layout component.
	ErrorBoundary,
} from "expo-router"

export const unstable_settings = {
	// Ensure that reloading on `/modal` keeps a back button present.
	initialRouteName: "(tabs)",
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
	const [loaded, error] = useFonts({
		SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
		...FontAwesome.font,
	})

	const [session, setSession] = useState<Session | null>(null)

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session)
		})

		const signOutListener = supabase.auth.onAuthStateChange(
			(event, session) => {
				console.log("onAuthStateChange", { event, session })
				setSession(session)
			}
		)
		return () => {
			signOutListener.data.subscription.unsubscribe()
		}
	}, [router])

	// Expo Router uses Error Boundaries to catch errors in the navigation tree.
	useEffect(() => {
		if (error) throw error
	}, [error])

	useEffect(() => {
		if (loaded) {
			SplashScreen.hideAsync()
		}
	}, [loaded])

	if (!loaded) {
		return null
	}

	if (!session) {
		return <AuthLayoutNav />
	}

	return <RootLayoutNav />
}

function RootLayoutNav() {
	const colorScheme = useColorScheme()

	return (
		<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
			<Stack>
				<Stack.Screen
					name="(tabs)"
					options={{ headerShown: false }}
				/>
				<Stack.Screen
					name="modal"
					options={{ presentation: "modal" }}
				/>
			</Stack>
		</ThemeProvider>
	)
}
function AuthLayoutNav() {
	const colorScheme = useColorScheme()

	return (
		<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
			<Stack>
				<Stack.Screen
					name="(auth)"
					options={{ headerShown: false }}
				/>
			</Stack>
		</ThemeProvider>
	)
}
