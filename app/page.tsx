'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ArrowRightIcon, PlusIcon, MinusIcon } from 'lucide-react'

type Expense = {
  id: number
  description: string
  amount: number
  category: string
  paidBy: string
  splitMethod: 'equal' | 'exact' | 'percentage'
  participants: string[]
  splits: { [key: string]: number }
  date: Date
}

type User = {
  id: string
  name: string
}

type Transaction = {
  from: string
  to: string
  amount: number
}

export default function EnhancedSplitwiseClone() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [splitMethod, setSplitMethod] = useState<'equal' | 'exact' | 'percentage'>('equal')
  const [participants, setParticipants] = useState<string[]>([])
  const [splits, setSplits] = useState<{ [key: string]: string }>({})
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false)

  const users: User[] = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Charlie' },
    { id: '4', name: 'David' },
  ]

  const categories = ['Food', 'Transport', 'Accommodation', 'Entertainment', 'Other']

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  useEffect(() => {
    if (editingExpense) {
      setDescription(editingExpense.description)
      setAmount(editingExpense.amount.toString())
      setCategory(editingExpense.category)
      setPaidBy(editingExpense.paidBy)
      setSplitMethod(editingExpense.splitMethod)
      setParticipants(editingExpense.participants)
      setSplits(Object.fromEntries(Object.entries(editingExpense.splits).map(([key, value]) => [key, value.toString()])))
      setShowAddExpenseDialog(true)
    }
  }, [editingExpense])

  const handleAddOrUpdateExpense = () => {
    if (!description || !amount || !category || !paidBy || participants.length === 0) {
      alert('Please fill in all required fields')
      return
    }

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount)) {
      alert('Please enter a valid amount')
      return
    }

    let calculatedSplits: { [key: string]: number } = {}

    if (splitMethod === 'equal') {
      const splitAmount = numericAmount / participants.length
      participants.forEach(p => {
        calculatedSplits[p] = splitAmount
      })
    } else if (splitMethod === 'exact' || splitMethod === 'percentage') {
      let total = 0
      participants.forEach(p => {
        const value = parseFloat(splits[p] || '0')
        if (isNaN(value)) {
          alert(`Invalid ${splitMethod} for ${p}`)
          return
        }
        if (splitMethod === 'percentage') {
          calculatedSplits[p] = (value / 100) * numericAmount
        } else {
          calculatedSplits[p] = value
        }
        total += calculatedSplits[p]
      })

      if (Math.abs(total - numericAmount) > 0.01) {
        alert(`The total of ${splitMethod} splits does not match the expense amount`)
        return
      }
    }

    const newExpense: Expense = {
      id: editingExpense ? editingExpense.id : expenses.length + 1,
      description,
      amount: numericAmount,
      category,
      paidBy,
      splitMethod,
      participants,
      splits: calculatedSplits,
      date: editingExpense ? editingExpense.date : new Date(),
    }

    if (editingExpense) {
      setExpenses(expenses.map(e => e.id === editingExpense.id ? newExpense : e))
    } else {
      setExpenses([...expenses, newExpense])
    }

    resetForm()
    setShowAddExpenseDialog(false)
  }

  const resetForm = () => {
    setDescription('')
    setAmount('')
    setCategory('')
    setPaidBy('')
    setSplitMethod('equal')
    setParticipants([])
    setSplits({})
    setEditingExpense(null)
  }

  const handleDeleteExpense = (id: number) => {
    setExpenses(expenses.filter(e => e.id !== id))
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
  }

  const calculateBalances = () => {
    const balances: { [key: string]: number } = {}
    users.forEach(user => {
      balances[user.id] = 0
    })

    expenses.forEach(expense => {
      balances[expense.paidBy] += expense.amount
      Object.entries(expense.splits).forEach(([userId, amount]) => {
        balances[userId] -= amount
      })
    })

    return balances
  }

  const prepareDataForCategoryChart = () => {
    const categoryTotals: { [key: string]: number } = {}
    expenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount
    })
    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }))
  }

  const prepareDataForPayerChart = () => {
    const payerTotals: { [key: string]: number } = {}
    expenses.forEach(expense => {
      payerTotals[expense.paidBy] = (payerTotals[expense.paidBy] || 0) + expense.amount
    })
    return Object.entries(payerTotals).map(([id, amount]) => ({
      name: users.find(u => u.id === id)?.name || id,
      amount
    }))
  }

  const calculateSettlements = (): Transaction[] => {
    const balances = calculateBalances()
    const transactions: Transaction[] = []
    const debtors = Object.entries(balances).filter(([_, balance]) => balance < 0)
    const creditors = Object.entries(balances).filter(([_, balance]) => balance > 0)

    debtors.sort((a, b) => a[1] - b[1])
    creditors.sort((a, b) => b[1] - a[1])

    let i = 0, j = 0
    while (i < debtors.length && j < creditors.length) {
      const [debtorId, debtorBalance] = debtors[i]
      const [creditorId, creditorBalance] = creditors[j]
      const amount = Math.min(-debtorBalance, creditorBalance)

      transactions.push({
        from: debtorId,
        to: creditorId,
        amount: parseFloat(amount.toFixed(2))
      })

      debtors[i][1] += amount
      creditors[j][1] -= amount

      if (Math.abs(debtors[i][1]) < 0.01) i++
      if (Math.abs(creditors[j][1]) < 0.01) j++
    }

    return transactions
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-center text-primary font-sans">Splitwise</h1>
      
      <Tabs defaultValue="expenses" className="mb-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Expenses</CardTitle>
              <CardDescription>Manage your shared expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowAddExpenseDialog(true)} className="mb-4">
                <PlusIcon className="mr-2 h-4 w-4" /> Add New Expense
              </Button>
              <ScrollArea className="h-[400px]">
                {expenses.map((expense) => (
                  <div key={expense.id} className="mb-4 p-4 border rounded">
                    <h3 className="font-bold">{expense.description}</h3>
                    <p>Amount: ${expense.amount.toFixed(2)}</p>
                    <p>Category: {expense.category}</p>
                    <p>Paid by: {users.find(u => u.id === expense.paidBy)?.name}</p>
                    <p>Date: {expense.date.toLocaleDateString()}</p>
                    <p>Split method: {expense.splitMethod}</p>
                    <div>
                      <p>Splits:</p>
                      <ul>
                        {Object.entries(expense.splits).map(([userId, amount]) => (
                          <li key={userId}>
                            {users.find(u => u.id === userId)?.name}: ${amount.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-2">
                      <Button variant="outline" className="mr-2" onClick={() => handleEditExpense(expense)}>Edit</Button>
                      <Button variant="destructive" onClick={() => handleDeleteExpense(expense.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle>Balances</CardTitle>
              <CardDescription>See who owes what</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.entries(calculateBalances()).map(([userId, balance]) => (
                <div key={userId} className="mb-2">
                  <span className="font-bold">{users.find(u => u.id === userId)?.name}: </span>
                  <span className={balance > 0 ? 'text-green-600' : 'text-red-600'}>
                    ${Math.abs(balance).toFixed(2)} {balance > 0 ? 'to receive' : 'to pay'}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settlements">
          <Card>
            <CardHeader>
              <CardTitle>Suggested Settlements</CardTitle>
              <CardDescription>Optimize your payments</CardDescription>
            </CardHeader>
            <CardContent>
              {calculateSettlements().map((transaction, index) => (
                <div key={index} className="mb-2 flex items-center">
                  <span className="font-bold">{users.find(u => u.id === transaction.from)?.name}</span>
                  <ArrowRightIcon className="mx-2" />
                  <span className="font-bold">{users.find(u => u.id === transaction.to)?.name}</span>
                  <span className="ml-2">${transaction.amount.toFixed(2)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="charts">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={prepareDataForCategoryChart()}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    >
                      {prepareDataForCategoryChart().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expenses by Payer</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareDataForPayerChart()}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddExpenseDialog} onOpenChange={setShowAddExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
            <DialogDescription>Enter the details of the expense</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paidBy" className="text-right">
                Paid By
              </Label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select who paid" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Participants</Label>
              <div className="col-span-3 flex flex-wrap gap-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`participant-${user.id}`}
                      checked={participants.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setParticipants([...participants, user.id])
                        } else {
                          setParticipants(participants.filter(p => p !== user.id))
                        }
                      }}
                    />
                    <label
                      htmlFor={`participant-${user.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {user.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="splitMethod" className="text-right">
                Split Method
              </Label>
              <Select value={splitMethod} onValueChange={(value: 'equal' | 'exact' | 'percentage') => setSplitMethod(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select split method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Equal</SelectItem>
                  <SelectItem value="exact">Exact Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {splitMethod !== 'equal' && participants.length > 0 && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{splitMethod === 'exact' ? 'Exact Amounts' : 'Percentages'}</Label>
                <div className="col-span-3 grid gap-2">
                  {participants.map((userId) => (
                    <div key={userId} className="flex items-center space-x-2">
                      <Label htmlFor={`split-${userId}`} className="w-20">{users.find(u => u.id === userId)?.name}</Label>
                      <Input
                        id={`split-${userId}`}
                        type="number"
                        value={splits[userId] || ''}
                        onChange={(e) => setSplits({...splits, [userId]: e.target.value})}
                        placeholder={splitMethod === 'exact' ? 'Amount' : 'Percentage'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleAddOrUpdateExpense}>{editingExpense ? 'Update Expense' : 'Add Expense'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}