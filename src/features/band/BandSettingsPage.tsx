import { useState } from 'react'
import { useBandStore } from '@/store/useBandStore'
import { useMemberStore } from '@/store/useMemberStore'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { ROLE_LABELS } from '@/lib/constants'
import { escapeHtml } from '@/lib/utils'
import { Plus, Edit2, Trash2, Users, Crown, Music } from 'lucide-react'
import type { Member, MemberRole } from '@/types'

interface MemberFormData {
  name: string
  instrument: string
  role: MemberRole
}

export function BandSettingsPage() {
  const { getCurrentBand, updateBand } = useBandStore()
  const { members, createMember, updateMember, deleteMember, currentMemberId } = useMemberStore()
  const { can } = usePermission()
  const { toast } = useToast()
  const currentBand = getCurrentBand()

  const [editingBand, setEditingBand] = useState(false)
  const [bandForm, setBandForm] = useState({ name: '', foundedYear: 0, description: '' })
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [memberForm, setMemberForm] = useState<MemberFormData>({ name: '', instrument: '', role: 'member' })
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)

  if (!currentBand) return <EmptyState icon="🎸" title="暂无乐队" description="请先创建一个乐队" />

  function startEditBand() {
    if (!can('edit_band_info')) { toast.error('权限不足'); return }
    setBandForm({ name: currentBand!.name, foundedYear: currentBand!.foundedYear, description: currentBand!.description })
    setEditingBand(true)
  }

  async function saveBand() {
    if (!can('edit_band_info')) { toast.error('权限不足'); return }
    if (!bandForm.name.trim()) { toast.error('乐队名称不能为空'); return }
    try {
      await updateBand(currentBand!.id, {
        name: escapeHtml(bandForm.name.trim()),
        foundedYear: bandForm.foundedYear,
        description: escapeHtml(bandForm.description),
      })
      toast.success('乐队信息已更新')
      setEditingBand(false)
    } catch (e) {
      toast.error('保存失败：' + (e as Error).message)
    }
  }

  function startAddMember() {
    if (!can('manage_members')) { toast.error('权限不足：仅管理员可添加成员'); return }
    setMemberForm({ name: '', instrument: '', role: 'member' })
    setEditingMember(null)
    setShowMemberForm(true)
  }

  function startEditMember(m: Member) {
    if (!can('manage_members')) { toast.error('权限不足'); return }
    setMemberForm({ name: m.name, instrument: m.instrument, role: m.role })
    setEditingMember(m)
    setShowMemberForm(true)
  }

  async function saveMember() {
    if (!can('manage_members')) { toast.error('权限不足'); return }
    if (!memberForm.name.trim()) { toast.error('成员姓名不能为空'); return }
    if (!memberForm.instrument.trim()) { toast.error('请填写负责乐器'); return }
    try {
      if (editingMember) {
        await updateMember(editingMember.id, {
          name: escapeHtml(memberForm.name.trim()),
          instrument: escapeHtml(memberForm.instrument.trim()),
          role: memberForm.role,
        })
        toast.success('成员信息已更新')
      } else {
        await createMember({
          bandId: currentBand!.id,
          name: escapeHtml(memberForm.name.trim()),
          instrument: escapeHtml(memberForm.instrument.trim()),
          role: memberForm.role,
        })
        toast.success('成员已添加')
      }
      setShowMemberForm(false)
    } catch (e) {
      toast.error('操作失败：' + (e as Error).message)
    }
  }

  async function confirmDeleteMember() {
    if (!deleteTarget || !can('manage_members')) return
    try {
      await deleteMember(deleteTarget.id)
      toast.success('成员已移除')
      setDeleteTarget(null)
    } catch (e) {
      toast.error('删除失败：' + (e as Error).message)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* 乐队信息卡片 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Music className="w-5 h-5 text-blue-500" />
            乐队信息
          </h2>
          {!editingBand && can('edit_band_info') && (
            <button
              onClick={startEditBand}
              className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              <Edit2 className="w-4 h-4" />
              编辑
            </button>
          )}
        </div>

        {editingBand ? (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">乐队名称 *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={bandForm.name}
                onChange={e => setBandForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && saveBand()}
                style={{ minHeight: 44 }}
                placeholder="乐队名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">成立年份</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={bandForm.foundedYear || ''}
                onChange={e => setBandForm(f => ({ ...f, foundedYear: Number(e.target.value) }))}
                style={{ minHeight: 44 }}
                placeholder="2023"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">乐队简介</label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                rows={3}
                value={bandForm.description}
                onChange={e => setBandForm(f => ({ ...f, description: e.target.value }))}
                placeholder="简短介绍你们的乐队"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingBand(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg" style={{ minHeight: 44 }}>取消</button>
              <button onClick={saveBand} className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg" style={{ minHeight: 44 }}>保存</button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{currentBand.name}</span>
              {currentBand.foundedYear > 0 && (
                <span className="text-sm text-gray-400">成立于 {currentBand.foundedYear} 年</span>
              )}
            </div>
            {currentBand.description && (
              <p className="text-sm text-gray-600">{currentBand.description}</p>
            )}
          </div>
        )}
      </div>

      {/* 成员管理 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            成员管理
            <span className="text-sm text-gray-400 font-normal">({members.length}人)</span>
          </h2>
          {can('manage_members') && (
            <button
              onClick={startAddMember}
              className="flex items-center gap-1.5 text-sm text-white bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded-lg"
              style={{ minHeight: 44 }}
            >
              <Plus className="w-4 h-4" />
              添加成员
            </button>
          )}
        </div>

        {members.length === 0 ? (
          <EmptyState icon={<Users className="w-12 h-12 text-gray-300" />} title="暂无成员" description="点击右上角添加成员" />
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold text-sm">{m.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{m.name}</span>
                    {m.role === 'admin' && <Crown className="w-4 h-4 text-yellow-500" />}
                    {m.id === currentMemberId && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">我</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{m.instrument} · {ROLE_LABELS[m.role]}</p>
                </div>
                {can('manage_members') && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditMember(m)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      style={{ minWidth: 44, minHeight: 44 }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(m)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      style={{ minWidth: 44, minHeight: 44 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 成员表单弹窗 */}
      {showMemberForm && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{editingMember ? '编辑成员' : '添加成员'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">姓名 *</label>
                <input
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={memberForm.name}
                  onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))}
                  style={{ minHeight: 44 }}
                  placeholder="成员姓名"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">负责乐器 *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={memberForm.instrument}
                  onChange={e => setMemberForm(f => ({ ...f, instrument: e.target.value }))}
                  style={{ minHeight: 44 }}
                  placeholder="如：吉他、贝斯、鼓"
                  onKeyDown={e => e.key === 'Enter' && saveMember()}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">角色</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  value={memberForm.role}
                  onChange={e => setMemberForm(f => ({ ...f, role: e.target.value as MemberRole }))}
                  style={{ minHeight: 44 }}
                >
                  <option value="admin">管理员</option>
                  <option value="member">普通成员</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowMemberForm(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg" style={{ minHeight: 44 }}>取消</button>
              <button onClick={saveMember} className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg" style={{ minHeight: 44 }}>保存</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="移除成员"
        message={`确定要移除成员「${deleteTarget?.name}」吗？此操作不可撤销。`}
        confirmText="移除"
        onConfirm={confirmDeleteMember}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  )
}
