import { Text, TextInput } from "react-native"
import { supabase } from "@/utils/supabase"
import { useState } from "react"
import { View } from "@/components/Themed"
import { router } from "expo-router"

export default function SignIn() {
	const [phoneNum, setPhoneNum] = useState("19549940000")
	const [submitted, setSubmitted] = useState(false)
	const [otp, setOtp] = useState("000000")

	const handlePhoneSignIn = async () => {
		try {
			const { data, error } = await supabase.auth.signInWithOtp({
				phone: phoneNum,
			})

			if (error) {
				return
			}

			setSubmitted(true)
		} catch (error) {
			setSubmitted(false)
		}
	}

	const handleOtpSignIn = async () => {
		try {
			const {
				data: { session },
				error,
			} = await supabase.auth.verifyOtp({
				phone: phoneNum,
				token: otp,
				type: "sms",
			})

			if (error) {
				console.error("Error signing in:", error)
				return
			}

			router.replace("/(tabs)")
		} catch (error) {
			console.error("Error signing in:", error)
		}
	}

	return (
		<View
			style={{
				flex: 1,
				justifyContent: "center",
				alignItems: "center",
				gap: 20,
			}}
		>
			<TextInput
				value={phoneNum}
				onChangeText={setPhoneNum}
				placeholder="Phone number"
				keyboardType="phone-pad"
				style={{
					borderWidth: 1,
					borderRadius: 5,
					padding: 10,
					width: 200,
				}}
			/>
			<Text onPress={handlePhoneSignIn}>Sign in</Text>

			{submitted && (
				<TextInput
					value={otp}
					onChangeText={setOtp}
					placeholder="OTP"
					keyboardType="number-pad"
					style={{
						borderWidth: 1,
						borderRadius: 5,
						padding: 10,
						width: 200,
					}}
				/>
			)}
			{submitted && <Text onPress={handleOtpSignIn}>Verify</Text>}
		</View>
	)
}
