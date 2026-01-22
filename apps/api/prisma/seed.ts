import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Hash password for demo users
  const hashedPassword = await bcrypt.hash('Demo123456', 12)

  // Create demo users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@openchat.dev' },
    update: {},
    create: {
      email: 'alice@openchat.dev',
      username: 'alice_demo',
      displayName: 'Alice Johnson',
      password: hashedPassword,
      status: 'ONLINE',
      isVerified: true,
    },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@openchat.dev' },
    update: {},
    create: {
      email: 'bob@openchat.dev',
      username: 'bob_demo',
      displayName: 'Bob Wilson',
      password: hashedPassword,
      status: 'ONLINE',
      isVerified: true,
    },
  })

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@openchat.dev' },
    update: {},
    create: {
      email: 'charlie@openchat.dev',
      username: 'charlie_demo',
      displayName: 'Charlie Brown',
      password: hashedPassword,
      status: 'AWAY',
      isVerified: true,
    },
  })

  // Create a group chat
  const groupChat = await prisma.chat.create({
    data: {
      type: 'GROUP',
      name: 'OpenChat Developers',
      description: 'Discussion about OpenChat PWA development',
      participants: {
        create: [
          { userId: alice.id },
          { userId: bob.id },
          { userId: charlie.id },
        ]
      },
      admins: {
        create: { userId: alice.id }
      }
    }
  })

  // Create a private chat between Alice and Bob
  const privateChat = await prisma.chat.create({
    data: {
      type: 'PRIVATE',
      participants: {
        create: [
          { userId: alice.id },
          { userId: bob.id },
        ]
      }
    }
  })

  // Add some demo messages
  const messages = [
    {
      content: 'Welcome to OpenChat! 🎉',
      senderId: alice.id,
      chatId: groupChat.id,
      type: 'TEXT'
    },
    {
      content: 'This is looking great! The real-time features are working perfectly.',
      senderId: bob.id,
      chatId: groupChat.id,
      type: 'TEXT'
    },
    {
      content: 'I love the modern UI design with Tailwind CSS!',
      senderId: charlie.id,
      chatId: groupChat.id,
      type: 'TEXT'
    },
    {
      content: 'Hey Bob! How\'s the testing going?',
      senderId: alice.id,
      chatId: privateChat.id,
      type: 'TEXT'
    },
    {
      content: 'Everything looks perfect! Authentication, real-time messaging, it all works beautifully.',
      senderId: bob.id,
      chatId: privateChat.id,
      type: 'TEXT'
    },
  ]

  for (const messageData of messages) {
    await prisma.message.create({ data: messageData })
  }

  console.log('✅ Database seeded successfully!')
  console.log('\n📊 Demo Data Created:')
  console.log(`👥 Users: ${alice.displayName}, ${bob.displayName}, ${charlie.displayName}`)
  console.log(`💬 Group Chat: "${groupChat.name}"`)
  console.log(`🔒 Private Chat: ${alice.displayName} ↔ ${bob.displayName}`)
  console.log(`📝 Messages: ${messages.length} demo messages`)
  console.log('\n🔑 Demo Login Credentials (all users):')
  console.log('Password: Demo123456')
  console.log('Emails: alice@openchat.dev, bob@openchat.dev, charlie@openchat.dev')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })