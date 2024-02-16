import {
	Button,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	TextInput,
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

import EditScreenInfo from "@/components/EditScreenInfo"
import { Text, View } from "@/components/Themed"
import { Stack, useLocalSearchParams } from "expo-router"
import { useEffect, useRef, useState } from "react"
import { supabase } from "@/utils/supabase"
import { RealtimePostgresInsertPayload } from "@supabase/supabase-js"

type User = Database["public"]["Views"]["app_users"]["Row"]
type Message = Omit<
	Database["public"]["Tables"]["messages"]["Row"],
	"read_on"
> & {
	sending?: boolean
	read_on?: string | null | undefined
}

export default function TabTwoScreen() {
	const { to } = useLocalSearchParams()
	const flatListRef = useRef<FlatList>(null)

	const [currentUser, setCurrentUser] = useState<User | null>(null)
	const [receiver, setReceiver] = useState<User | null>(null)
	const [messages, setMessages] = useState<Message[]>([])
	const [sending, setSending] = useState(false)

	const [inputText, setInputText] = useState("")
	const insets = useSafeAreaInsets()

	// Retrieve receiver from the database
	const getReceiver = async () => {
		try {
			const { data, error } = await supabase
				.from("app_users")
				.select("*")
				.eq("id", to)

			if (error) {
				console.error("Error fetching users", error)
				return
			}

			return data[0]
		} catch (error) {
			console.error("Error fetching users", error)
		}
	}

	useEffect(() => {
		getReceiver().then((user) => {
			if (!user) return
			setReceiver(user)
		})
	}, [to])

	const getMessages = async (sender_id: string, receiver_id: string) => {
		try {
			console.log("fetching messages")
			console.log(
				`sender_id.eq.${sender_id},and(receiver_id.eq.${receiver_id})`
			)
			const { data, error } = await supabase
				.from("messages")
				.select("*")
				.filter("sender_id", "in", `(${sender_id},${receiver_id})`)
				.filter("receiver_id", "in", `(${sender_id},${receiver_id})`)
				.order("sent_on", { ascending: true })

			if (error) {
				console.error("Error fetching messages", error)
				return
			}

			console.log("data", data)

			return data
		} catch (error) {
			console.error("Error fetching messages", error)
		}
	}

	useEffect(() => {
		if (!currentUser) return
		if (!to) return

		console.log("currentUser", currentUser.id)
		console.log("to", to)
		getMessages(currentUser.id as string, to as string).then((messages) => {
			if (!messages) return
			setMessages(messages)
		})
	}, [to, currentUser?.id])

	useEffect(() => {
		// flatListRef.current?.scr({ animated: true })
	}, [messages.length])

	const sendMessage = async () => {
		if (!inputText) return

		try {
			setSending(true)

			// Add the message to the list of messages, temporarily, remove on finally, put the message with id 'sending' to the list
			setMessages([
				...messages,
				{
					id: "sending",
					sender_id: currentUser?.id as string,
					receiver_id: to as string,
					message: inputText,
					type: "text",
					sent_on: new Date().toISOString(),
					sending: true,
				},
			])

			flatListRef.current?.scrollToEnd({ animated: true })

			const { data, error } = await supabase.from("messages").insert([
				{
					sender_id: currentUser?.id as string,
					receiver_id: to as string,
					message: inputText,
					type: "text",
					sent_on: new Date().toISOString(),
				},
			])

			if (error) {
				console.error("Error sending message", error)
				return
			}

			setInputText("")
		} catch (error) {
			console.error("Error sending message", error)
		} finally {
			setSending(false)
		}
	}

	const getAuthUser = async () => {
		try {
			const { data, error } = await supabase.auth.getUser()
			if (error) {
				console.error("Error fetching users", error)
				return
			}

			return data
		} catch (error) {
			console.error("Error fetching users", error)
		}
	}

	const getAppUser = async () => {
		try {
			// Get the user from the database

			const user = await getAuthUser()

			if (!user) return null

			const { data, error } = await supabase
				.from("app_users")
				.select("*")
				.eq("id", user.user.id)

			if (error) {
				console.error("Error fetching users", error)
				return
			}

			return data[0]
		} catch (error) {}
	}

	useEffect(() => {
		getAppUser().then((user) => {
			if (!user) return
			setCurrentUser(user)
		})
	}, [])

	// Create a function to handle inserts
	const handleInserts = (payload: RealtimePostgresInsertPayload<Message>) => {
		console.log("Change received!", payload)
		if (payload.eventType === "INSERT") {
			// check if the message belongs to the current conversation
			console.log("checking message")

			if (
				!(
					payload.new.sender_id === currentUser?.id &&
					payload.new.receiver_id === to
				) &&
				!(
					payload.new.sender_id === to &&
					payload.new.receiver_id === currentUser?.id
				)
			) {
				console.log("message not for this conversation")
				return
			}

			setMessages((m) =>
				[...m, { ...payload.new }]
					.filter((m) => !m.sending)
					.sort(
						(a, b) =>
							new Date(a.sent_on ?? 0).getTime() -
							new Date(b.sent_on ?? 0).getTime()
					)
			)
		}
	}

	useEffect(() => {
		if (!to || !currentUser) return

		supabase
			.channel(`messages:from:${currentUser.id}:to:${to}`)
			.on(
				"postgres_changes",
				{ event: "INSERT", schema: "public", table: "messages" },
				handleInserts
			)
			.subscribe()
	}, [to, currentUser?.id])

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			keyboardVerticalOffset={Platform.OS === "ios" ? 74 : 0}
		>
			<Text style={styles.header}>{receiver?.name}</Text>
			<FlatList
				ref={flatListRef}
				data={messages}
				keyExtractor={(item) => item.id.toString()}
				onContentSizeChange={() =>
					flatListRef.current?.scrollToEnd({ animated: false })
				}
				contentContainerStyle={{ paddingBottom: 40 }}
				renderItem={({ item }) => (
					<View
						style={[
							styles.messageContainer,
							{
								backgroundColor: !!item.sending
									? "#e5e5e5"
									: item.sender_id === currentUser?.id
									? "#dcf8c6"
									: "#fff",
							},
						]}
					>
						<Text
							style={{
								...styles.messageText,
								color: item.sending ? "#9a9a9aWorks" : "#222",
							}}
						>
							{item.message}
						</Text>
					</View>
				)}
				style={styles.messageList}
			/>
			<View
				style={{
					...styles.inputContainer,
					paddingBottom: insets.bottom,
				}}
			>
				<TextInput
					style={styles.input}
					value={inputText}
					onChangeText={setInputText}
					placeholder="Type a message"
				/>
				<Button
					title="Send"
					onPress={sendMessage}
				/>
			</View>
		</KeyboardAvoidingView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		paddingVertical: 10,
		paddingHorizontal: 20,
		fontSize: 18,
		fontWeight: "bold",
		textAlign: "center",
		borderBottomWidth: 1,
		borderBottomColor: "#ccc",
	},
	messageList: {
		flex: 1,
	},
	messageContainer: {
		padding: 10,
		marginVertical: 4,
		marginHorizontal: 10,
		borderRadius: 20,
		maxWidth: "80%",
		alignSelf: "flex-end",
	},
	messageText: {
		fontSize: 16,
	},
	inputContainer: {
		flexDirection: "row",
		padding: 10,
		alignItems: "center",
	},
	input: {
		flex: 1,
		marginRight: 10,
		borderWidth: 1,
		borderColor: "#ccc",
		padding: 10,
		borderRadius: 20, // Rounded md
	},
})
