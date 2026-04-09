import { db } from './db'
import type { Band, Member, BandEvent, Task, Score, Setlist, FileBlob } from '@/types'
import { generateId } from './utils'

// 生成一个简单的PDF blob（占位符）
function makeFakePdfBlob(title: string): Blob {
  const content = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 24 Tf 100 700 Td (${title}) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000360 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
441
%%EOF`
  return new Blob([content], { type: 'application/pdf' })
}

// 生成简单的图片blob（1x1像素PNG）
function makeFakePngBlob(): Blob {
  const bytes = new Uint8Array([
    0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,
    0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,
    0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
    0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
    0xDE,0x00,0x00,0x00,0x0C,0x49,0x44,0x41,
    0x54,0x08,0xD7,0x63,0xF8,0xCF,0xC0,0x00,
    0x00,0x00,0x02,0x00,0x01,0xE2,0x21,0xBC,
    0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,
    0x44,0xAE,0x42,0x60,0x82
  ])
  return new Blob([bytes], { type: 'image/png' })
}

// 生成简单的音频blob
function makeFakeAudioBlob(): Blob {
  // 最小WAV文件头
  const buffer = new ArrayBuffer(44)
  const view = new DataView(buffer)
  // RIFF header
  view.setUint32(0, 0x52494646, false) // "RIFF"
  view.setUint32(4, 36, true) // chunk size
  view.setUint32(8, 0x57415645, false) // "WAVE"
  view.setUint32(12, 0x666d7420, false) // "fmt "
  view.setUint32(16, 16, true) // subchunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // channels
  view.setUint32(24, 44100, true) // sample rate
  view.setUint32(28, 88200, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  view.setUint32(36, 0x64617461, false) // "data"
  view.setUint32(40, 0, true) // data size
  return new Blob([buffer], { type: 'audio/wav' })
}

export async function initMockData(): Promise<void> {
  const existing = await db.bands.count()
  if (existing > 0) return // 已有数据，不重复初始化

  const now = Date.now()
  const bandId = generateId()
  const adminId = generateId()
  const member1Id = generateId()
  const member2Id = generateId()

  // 1. 创建示例乐队
  const band: Band = {
    id: bandId,
    name: '星河乐队',
    foundedYear: 2023,
    description: '一支热爱摇滚的独立乐队，梦想站上大舞台',
    createdAt: now,
  }
  await db.bands.add(band)

  // 2. 创建成员
  const members: Member[] = [
    { id: adminId, bandId, name: '张明（我）', instrument: '主唱/吉他', role: 'admin', createdAt: now },
    { id: member1Id, bandId, name: '李华', instrument: '贝斯', role: 'member', createdAt: now },
    { id: member2Id, bandId, name: '王芳', instrument: '鼓', role: 'member', createdAt: now },
  ]
  await db.members.bulkAdd(members)

  // 3. 创建日程
  const rehearsalId = generateId()
  const perfId = generateId()
  const threeDaysLater = now + 3 * 24 * 60 * 60 * 1000
  const sevenDaysLater = now + 7 * 24 * 60 * 60 * 1000

  const events: BandEvent[] = [
    {
      id: rehearsalId,
      bandId,
      title: '周末排练',
      type: 'rehearsal',
      startTime: threeDaysLater,
      endTime: threeDaysLater + 3 * 60 * 60 * 1000,
      location: '星河排练室 B02',
      notes: '重点练习新歌《夏日余晖》副歌部分',
      attachmentIds: [],
      creatorMemberId: adminId,
      createdAt: now,
    },
    {
      id: perfId,
      bandId,
      title: '酒吧演出 - 迷笛之夜',
      type: 'performance',
      startTime: sevenDaysLater,
      endTime: sevenDaysLater + 2 * 60 * 60 * 1000,
      location: '某酒吧 Live House',
      notes: '8首曲目，注意音量控制',
      attachmentIds: [],
      creatorMemberId: adminId,
      createdAt: now,
    },
  ]
  await db.events.bulkAdd(events)

  // 4. 创建任务
  const oneDayLater = now + 24 * 60 * 60 * 1000
  const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000

  const tasks: Task[] = [
    {
      id: generateId(),
      eventId: rehearsalId,
      bandId,
      title: '准备《夏日余晖》新版编曲',
      assigneeMemberId: adminId,
      dueDate: oneDayLater,
      details: '副歌前加一个过渡和弦',
      completed: false,
      completedAt: 0,
      creatorMemberId: adminId,
      createdAt: now,
    },
    {
      id: generateId(),
      eventId: rehearsalId,
      bandId,
      title: '确认排练室预约',
      assigneeMemberId: adminId,
      dueDate: oneDayLater,
      details: '',
      completed: true,
      completedAt: now - 60 * 60 * 1000,
      creatorMemberId: adminId,
      createdAt: now,
    },
    {
      id: generateId(),
      eventId: rehearsalId,
      bandId,
      title: '练习新贝斯线',
      assigneeMemberId: member1Id,
      dueDate: threeDaysLater,
      details: '第二段B段贝斯独奏部分',
      completed: false,
      completedAt: 0,
      creatorMemberId: adminId,
      createdAt: now,
    },
    {
      id: generateId(),
      eventId: perfId,
      bandId,
      title: '检查鼓组设备',
      assigneeMemberId: member2Id,
      dueDate: sevenDaysLater - 24 * 60 * 60 * 1000,
      details: '确认踩镲、军鼓状态',
      completed: false,
      completedAt: 0,
      creatorMemberId: adminId,
      createdAt: now,
    },
    {
      id: generateId(),
      eventId: perfId,
      bandId,
      title: '联系演出场地负责人',
      assigneeMemberId: adminId,
      dueDate: twoDaysAgo, // 已逾期
      details: '确认演出细节和音响配置',
      completed: false,
      completedAt: 0,
      creatorMemberId: adminId,
      createdAt: now,
    },
  ]
  await db.tasks.bulkAdd(tasks)

  // 5. 创建文件blob
  const pdfBlob = makeFakePdfBlob('夏日余晖 - 主谱')
  const pngBlob = makeFakePngBlob()
  const audioBlob = makeFakeAudioBlob()

  const fileId1 = generateId()
  const fileId2 = generateId()
  const fileId3 = generateId()

  const fileBlobs: FileBlob[] = [
    { id: fileId1, bandId, fileName: '夏日余晖-主谱.pdf', fileType: 'application/pdf', fileSize: pdfBlob.size, blob: pdfBlob, uploadedAt: now - 5 * 24 * 60 * 60 * 1000 },
    { id: fileId2, bandId, fileName: '迷雾中的你-和弦谱.png', fileType: 'image/png', fileSize: pngBlob.size, blob: pngBlob, uploadedAt: now - 3 * 24 * 60 * 60 * 1000 },
    { id: fileId3, bandId, fileName: '夏日余晖-demo.wav', fileType: 'audio/wav', fileSize: audioBlob.size, blob: audioBlob, uploadedAt: now - 2 * 24 * 60 * 60 * 1000 },
  ]
  await db.file_blobs.bulkAdd(fileBlobs)

  // 6. 创建乐谱元数据
  const scoreId1 = generateId()
  const scoreId2 = generateId()
  const scoreId3 = generateId()

  const scores: Score[] = [
    { id: scoreId1, bandId, fileId: fileId1, songName: '夏日余晖', key: 'C大调', instrument: '吉他', partType: 'main', tags: ['原创', '摇滚'], uploadedAt: now - 5 * 24 * 60 * 60 * 1000 },
    { id: scoreId2, bandId, fileId: fileId2, songName: '迷雾中的你', key: 'G大调', instrument: '吉他', partType: 'chord', tags: ['翻唱', '民谣'], uploadedAt: now - 3 * 24 * 60 * 60 * 1000 },
    { id: scoreId3, bandId, fileId: fileId3, songName: '夏日余晖', key: 'C大调', instrument: '全团', partType: 'part', tags: ['原创', 'demo'], uploadedAt: now - 2 * 24 * 60 * 60 * 1000 },
  ]
  await db.scores.bulkAdd(scores)

  // 7. 创建歌单
  const setlist: Setlist = {
    id: generateId(),
    bandId,
    name: '迷笛之夜演出歌单',
    description: '2026年春季演出曲目',
    songs: [
      { scoreId: scoreId1, order: 0, notes: '开场曲，节奏稍快' },
      { scoreId: scoreId2, order: 1, notes: '间奏前降半音' },
    ],
    updatedAt: now,
  }
  await db.setlists.add(setlist)

  // 8. 设置默认当前成员到 localStorage
  localStorage.setItem('currentMemberId', adminId)
  localStorage.setItem('currentBandId', bandId)

  console.log('✅ Mock数据初始化完成')
}
