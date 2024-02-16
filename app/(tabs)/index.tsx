import React, { useEffect, useState } from "react"
import {
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useColorScheme,
} from "react-native"
import { faker } from "@faker-js/faker"
import { Link, Stack, router } from "expo-router"
import { supabase } from "@/utils/supabase"
import { FontAwesome } from "@expo/vector-icons"
import { Colors } from "react-native/Libraries/NewAppScreen"

type User = Database["public"]["Views"]["app_users"]["Row"]

export default function TabOneScreen() {
	const colorScheme = useColorScheme()

	const [users, setUsers] = useState<User[]>([])

	const getSupabaseUsers = async () => {
		try {
			const { data: user, error: errorUser } = await supabase.auth.getUser()

			if (errorUser) {
				console.error("Error fetching user", errorUser)
				return
			}

			const { data, error } = await supabase
				.from("app_users")
				.select("*")
				.neq("id", user?.user.id)
			if (error) {
				console.error("Error fetching users", error)
				return
			}

			console.log("data", data)

			setUsers(data)
		} catch (error) {
			console.error("Error fetching users", error)
		}
	}

	// const generateUsers = (size = 30) => {
	// 	const usersArray = []
	// 	for (let i = 0; i < size; i++) {
	// 		usersArray.push({
	// 			id: faker.database.mongodbObjectId(),
	// 			phone: faker.phone.number(),
	// 			name: faker.person.fullName(),
	// 		})
	// 	}
	// 	setUsers(usersArray)
	// }

	useEffect(() => {
		// generateUsers()
		getSupabaseUsers()
	}, [])

	return (
		<View style={styles.container}>
			<Stack.Screen
				options={{
					title: "Contacts",
					headerRight: () => (
						<Link
							href="/modal"
							asChild
						>
							<Pressable>
								{({ pressed }) => (
									<FontAwesome
										name="info-circle"
										size={25}
										color={Colors[colorScheme ?? "light"].text}
										style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
									/>
								)}
							</Pressable>
						</Link>
					),
				}}
			/>
			<FlatList
				data={users}
				renderItem={renderItem}
				keyExtractor={(item) => item.id as string}
			/>
		</View>
	)
}

function TabBarIcon(props: {
	name: React.ComponentProps<typeof FontAwesome>["name"]
	color: string
}) {
	return (
		<FontAwesome
			size={28}
			style={{ marginBottom: -3 }}
			{...props}
		/>
	)
}
const renderItem = ({ item }: { item: User }) => (
	<Link
		href={{
			pathname: "/messages",
			params: { to: item.id as string },
		}}
		asChild
	>
		<TouchableOpacity style={styles.item}>
			<Text style={styles.phone}>{item.phone}</Text>
			<Text style={styles.name}>{item.name}</Text>
		</TouchableOpacity>
	</Link>
)

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	item: {
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: "#ccc",
	},
	phone: {
		fontSize: 16,
		color: "#000",
	},
	name: {
		fontSize: 14,
		color: "#666",
	},
})
