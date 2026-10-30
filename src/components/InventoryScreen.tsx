import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { saveJsPdf, saveFile, ensureStoragePermission } from '../services/fileSaver';
import { t } from '../utils/i18n';
import {
  PlusCircle,
  Tag,
  LayoutGrid,
  ClipboardList,
  Camera,
  Search,
  ArrowUpDown,
  Calendar,
  Download,
  Trash2,
  Edit3,
  TrendingUp,
  Package,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Receipt as ReceiptIcon,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Cloud,
  User,
  ArrowLeft,
  Loader2,
  Hash,
  Users,
  Phone,
  MessageCircle,
  Send,
  Check,
  Share2,
  Clock,
  PieChart,
  BarChart3,
  ShoppingCart,
  CheckSquare,
  ListTodo,
  FolderPlus,
  Scan,
  MapPin,
  Mail,
  PhoneCall,
  UserCheck,
  Briefcase,
  Store,
  DollarSign,
  CalendarDays,
  CalendarCheck,
  IdCard,
  Upload,
  Image as ImageIcon,
  ArrowUpRight,
  Boxes,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import { BusinessProfile, InventoryProduct, InventorySale, InventoryExpense, InventoryDebt, InventoryTab, ShoppingListItem, ShoppingCategory, ProductCategory, Customer, BusinessAgent, BusinessWorker, StaffSaleRecord, AgentLedgerRecord } from '../types';
import { StorageService } from '../services/storage';
import { CloudflareService } from '../services/cloudflareService';
import { AdMobService, ADMOB_UNITS } from '../services/admobService';
import { AdMobNativeAd } from './AdMobNativeAd';
import { compressImageFile } from '../utils/imageCompressor';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { StaffManageModal } from './StaffManageModal';
import { AgentManageModal } from './AgentManageModal';
import { PhoneInputField } from './PhoneInputField';
import { jsPDF } from 'jspdf';

interface InventoryScreenProps {
  business: BusinessProfile;
  initialTab?: InventoryTab;
  initialShowAddInline?: boolean;
  onNavigateHome: () => void;
  onCategoryChange?: (category: 'products' | 'money' | 'people' | null) => void;
  onCreateReceiptWithItem?: (item: { name: string; unitPrice: number; quantity: number }) => void;
  onCreateInvoiceWithItem?: (item: { name: string; unitPrice: number; quantity: number }) => void;
}

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL'];

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  business,
  initialTab = 'stock',
  initialShowAddInline = false,
  onNavigateHome,
  onCategoryChange,
  onCreateReceiptWithItem,
  onCreateInvoiceWithItem,
}) => {
  const [activeTab, setActiveTab] = useState<InventoryTab>(initialTab);
  const currency = business.currency || 'UGX';

  const [currentCategory, setCurrentCategory] = useState<'products' | 'money' | 'people' | null>(() => {
    if (initialTab === 'expense' || initialTab === 'debts' || initialTab === 'report') return 'money';
    if (initialTab === 'customers' || initialTab === 'agents' || initialTab === 'workers') return 'people';
    if (initialTab === 'sales' || initialTab === 'shoppingList') return 'products';
    return null;
  });

  useEffect(() => {
    onCategoryChange?.(currentCategory);
  }, [currentCategory, onCategoryChange]);

  useEffect(() => {
    setActiveTab(initialTab);
    let cat: 'products' | 'money' | 'people' | null = null;
    if (initialTab === 'expense' || initialTab === 'debts' || initialTab === 'report') cat = 'money';
    else if (initialTab === 'customers' || initialTab === 'agents' || initialTab === 'workers') cat = 'people';
    else if (initialTab === 'sales' || initialTab === 'shoppingList') cat = 'products';
    setCurrentCategory(cat);
  }, [initialTab]);

  // Data states
  const [products, setProducts] = useState<InventoryProduct[]>(() => StorageService.getInventoryProducts());
  const [sales, setSales] = useState<InventorySale[]>(() => StorageService.getInventorySales());
  const [staffSales, setStaffSales] = useState<StaffSaleRecord[]>(() => StorageService.getStaffSales());
  const [agentLedger, setAgentLedger] = useState<AgentLedgerRecord[]>(() => StorageService.getAgentLedger());
  const [expenses, setExpenses] = useState<InventoryExpense[]>(() => StorageService.getInventoryExpenses());
  const [debts, setDebts] = useState<InventoryDebt[]>(() => StorageService.getInventoryDebts());
  const [stats, setStats] = useState(() => StorageService.getInventoryStats());

  useEffect(() => {
    const handleSync = () => {
      setProducts(StorageService.getInventoryProducts());
      setSales(StorageService.getInventorySales());
      setStaffSales(StorageService.getStaffSales());
      setAgentLedger(StorageService.getAgentLedger());
      setExpenses(StorageService.getInventoryExpenses());
      setDebts(StorageService.getInventoryDebts());
      setStats(StorageService.getInventoryStats());
      setCustomers(StorageService.getCustomers());
      setAgents(StorageService.getAgents());
      setWorkers(StorageService.getWorkers());
      setShoppingList(StorageService.getShoppingListItems());
      setProductCategories(StorageService.getProductCategories());
    };
    window.addEventListener('workos_user_updated', handleSync);
    window.addEventListener('storage_updated', handleSync);
    return () => {
      window.removeEventListener('workos_user_updated', handleSync);
      window.removeEventListener('storage_updated', handleSync);
    };
  }, []);

  // Shopping List States
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() => StorageService.getShoppingListItems());
  const [shoppingCategories, setShoppingCategories] = useState<ShoppingCategory[]>(() => StorageService.getShoppingCategories());
  const [shoppingItemName, setShoppingItemName] = useState<string>('');
  const [shoppingItemQty, setShoppingItemQty] = useState<string>('');
  const [shoppingItemEstPrice, setShoppingItemEstPrice] = useState<string>('');
  const [shoppingItemNotes, setShoppingItemNotes] = useState<string>('');
  const [shoppingItemCategoryId, setShoppingItemCategoryId] = useState<string>('');
  const [shoppingSearchQuery, setShoppingSearchQuery] = useState<string>('');
  const [shoppingFilter, setShoppingFilter] = useState<'all' | 'unchecked' | 'checked' | 'hidden'>('all');
  const [shoppingCategoryFilter, setShoppingCategoryFilter] = useState<string>('all');
  const [editingShoppingId, setEditingShoppingId] = useState<string | null>(null);
  const [showShoppingForm, setShowShoppingForm] = useState<boolean>(false);
  const [showCategoryForm, setShowCategoryForm] = useState<boolean>(false);
  const [showNewCategoryInline, setShowNewCategoryInline] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryColor, setNewCategoryColor] = useState<string>('#64748b');

  // Product Category States
  const [productCategories, setProductCategories] = useState<ProductCategory[]>(() => StorageService.getProductCategories());
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [showProductCategoryForm, setShowProductCategoryForm] = useState<boolean>(false);
  const [newProductCategoryName, setNewProductCategoryName] = useState<string>('');
  const [newProductCategoryColor, setNewProductCategoryColor] = useState<string>('#64748b');
  const [showAddProductInline, setShowAddProductInline] = useState<boolean>(initialShowAddInline);
  const [isAddProductBarcodeScannerOpen, setIsAddProductBarcodeScannerOpen] = useState<boolean>(false);

  // Edit Sale States
  const [editingSale, setEditingSale] = useState<InventorySale | null>(null);
  const [editSaleQuantity, setEditSaleQuantity] = useState<number>(1);
  const [editSalePrice, setEditSalePrice] = useState<number>(0);
  const [editSaleCustomer, setEditSaleCustomer] = useState<string>('');

  const handleStartEditSale = (sale: InventorySale) => {
    setEditingSale(sale);
    setEditSaleQuantity(sale.quantity);
    setEditSalePrice(sale.sellingPrice);
    setEditSaleCustomer(sale.customerName || '');
  };

  const handleSaveEditSale = () => {
    if (!editingSale) return;
    StorageService.updateInventorySale(editingSale.id, {
      quantity: editSaleQuantity,
      sellingPrice: editSalePrice,
      customerName: editSaleCustomer,
    });
    setSales(StorageService.getInventorySales());
    setEditingSale(null);
    setToastMessage('Sale updated successfully');
  };

  // Toast / notification feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalState({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Customer Directory States (rendered below stock section)
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [showAddCustomerForm, setShowAddCustomerForm] = useState<boolean>(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [custDirectoryName, setCustDirectoryName] = useState<string>('');
  const [customerLocation, setCustomerLocation] = useState<string>('');
  const [customerContact, setCustomerContact] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [custProfilePic, setCustProfilePic] = useState<string | undefined>(undefined);
  const [isUploadingCustPic, setIsUploadingCustPic] = useState<boolean>(false);
  const custFileInputRef = useRef<HTMLInputElement>(null);

  // Business Agent Directory States
  const [agents, setAgents] = useState<BusinessAgent[]>(() => StorageService.getAgents());
  const [agentSearchQuery, setAgentSearchQuery] = useState<string>('');
  const [showAddAgentForm, setShowAddAgentForm] = useState<boolean>(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [agentNameInput, setAgentNameInput] = useState<string>('');
  const [agentShopNameInput, setAgentShopNameInput] = useState<string>('');
  const [agentAddressInput, setAgentAddressInput] = useState<string>('');
  const [agentContactInput, setAgentContactInput] = useState<string>('');
  const [agentEmailInput, setAgentEmailInput] = useState<string>('');
  const [agentNotesInput, setAgentNotesInput] = useState<string>('');
  const [agentProfilePic, setAgentProfilePic] = useState<string | undefined>(undefined);
  const [isUploadingAgentPic, setIsUploadingAgentPic] = useState<boolean>(false);
  const [managingAgent, setManagingAgent] = useState<BusinessAgent | null>(null);
  const agentFileInputRef = useRef<HTMLInputElement>(null);

  // Business Worker / Staff Directory States
  const [workers, setWorkers] = useState<BusinessWorker[]>(() => StorageService.getWorkers());
  const [workerSearchQuery, setWorkerSearchQuery] = useState<string>('');
  const [showAddWorkerForm, setShowAddWorkerForm] = useState<boolean>(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [workerNameInput, setWorkerNameInput] = useState<string>('');
  const [workerPhoneInput, setWorkerPhoneInput] = useState<string>('');
  const [workerEmailInput, setWorkerEmailInput] = useState<string>('');
  const [workerNinInput, setWorkerNinInput] = useState<string>('');
  const [workerAddressInput, setWorkerAddressInput] = useState<string>('');
  const [workerStartDateInput, setWorkerStartDateInput] = useState<string>('');
  const [workerSalaryInput, setWorkerSalaryInput] = useState<string>('');
  const [workerSalaryPeriod, setWorkerSalaryPeriod] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [workerWorkDaysInput, setWorkerWorkDaysInput] = useState<string>('');
  const [workerWorkHoursInput, setWorkerWorkHoursInput] = useState<string>('');
  const [workerRoleInput, setWorkerRoleInput] = useState<string>('');
  const [workerNotesInput, setWorkerNotesInput] = useState<string>('');
  const [workerProfilePic, setWorkerProfilePic] = useState<string | undefined>(undefined);
  const [isUploadingWorkerPic, setIsUploadingWorkerPic] = useState<boolean>(false);
  const workerFileInputRef = useRef<HTMLInputElement>(null);
  const [expandedWorkerIds, setExpandedWorkerIds] = useState<Record<string, boolean>>({});
  const [managedWorker, setManagedWorker] = useState<BusinessWorker | null>(null);
  const [managedWorkerInitialTab, setManagedWorkerInitialTab] = useState<'sales' | 'losses' | 'incidents' | 'payroll' | 'analytics' | 'manage_attendance'>('sales');

  const toggleWorkerExpand = (id: string) => {
    setExpandedWorkerIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Profile Picture Upload Handlers
  const handleCustPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingCustPic(true);
      const compressed = await compressImageFile(file, { maxDimension: 360, quality: 0.75 });
      setCustProfilePic(compressed);

      try {
        const uploadRes = await CloudflareService.uploadFile({
          data: compressed,
          filename: `customer_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          folder: 'photos',
        });
        if (uploadRes.success && uploadRes.url) {
          setCustProfilePic(uploadRes.url);
          showToast('Customer photo saved to Cloud Storage!');
        }
      } catch (cfErr) {
        console.warn('Cloudflare customer photo upload note:', cfErr);
      }
    } catch (err) {
      console.warn('Failed to compress client photo:', err);
      showToast('Could not process photo');
    } finally {
      setIsUploadingCustPic(false);
      if (custFileInputRef.current) {
        custFileInputRef.current.value = '';
      }
    }
  };

  const handleAgentPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingAgentPic(true);
      const compressed = await compressImageFile(file, { maxDimension: 360, quality: 0.75 });
      setAgentProfilePic(compressed);

      try {
        const uploadRes = await CloudflareService.uploadFile({
          data: compressed,
          filename: `agent_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          folder: 'photos',
        });
        if (uploadRes.success && uploadRes.url) {
          setAgentProfilePic(uploadRes.url);
          showToast('Agent photo saved to Cloud Storage!');
        }
      } catch (cfErr) {
        console.warn('Cloudflare agent photo upload note:', cfErr);
      }
    } catch (err) {
      console.warn('Failed to compress agent photo:', err);
      showToast('Could not process photo');
    } finally {
      setIsUploadingAgentPic(false);
      if (agentFileInputRef.current) {
        agentFileInputRef.current.value = '';
      }
    }
  };

  const handleWorkerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingWorkerPic(true);
      const compressed = await compressImageFile(file, { maxDimension: 360, quality: 0.75 });
      setWorkerProfilePic(compressed);

      try {
        const uploadRes = await CloudflareService.uploadFile({
          data: compressed,
          filename: `staff_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          folder: 'photos',
        });
        if (uploadRes.success && uploadRes.url) {
          setWorkerProfilePic(uploadRes.url);
          showToast('Staff photo saved to Cloud Storage!');
        }
      } catch (cfErr) {
        console.warn('Cloudflare worker photo upload note:', cfErr);
      }
    } catch (err) {
      console.warn('Failed to compress worker photo:', err);
      showToast('Could not process photo');
    } finally {
      setIsUploadingWorkerPic(false);
      if (workerFileInputRef.current) {
        workerFileInputRef.current.value = '';
      }
    }
  };

  const refreshData = () => {
    setProducts(StorageService.getInventoryProducts());
    setSales(StorageService.getInventorySales());
    setStaffSales(StorageService.getStaffSales());
    setAgentLedger(StorageService.getAgentLedger());
    setExpenses(StorageService.getInventoryExpenses());
    setDebts(StorageService.getInventoryDebts());
    setShoppingList(StorageService.getShoppingListItems());
    setShoppingCategories(StorageService.getShoppingCategories());
    setProductCategories(StorageService.getProductCategories());
    setCustomers(StorageService.getCustomers());
    setAgents(StorageService.getAgents());
    setWorkers(StorageService.getWorkers());
    setStats(StorageService.getInventoryStats());
    CloudflareService.syncAllToCloudflare().catch((err) => console.warn('Inventory Cloudflare auto-sync note:', err));
  };

  // Sync inventory data with Cloudflare on mount
  useEffect(() => {
    CloudflareService.syncAllToCloudflare().catch(() => {});
  }, []);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custDirectoryName.trim()) {
      showToast('Please enter customer name');
      return;
    }
    if (!customerContact.trim()) {
      showToast('Please enter contact / phone number');
      return;
    }

    if (editingCustomerId) {
      StorageService.updateCustomer(editingCustomerId, {
        name: custDirectoryName.trim(),
        location: customerLocation.trim() || undefined,
        contact: customerContact.trim(),
        email: customerEmail.trim() || undefined,
        profilePic: custProfilePic,
        notes: customerNotes.trim() || undefined,
      });
      showToast('Client details updated & saved to Cloud Storage!');
    } else {
      StorageService.addCustomer({
        name: custDirectoryName.trim(),
        location: customerLocation.trim() || undefined,
        contact: customerContact.trim(),
        email: customerEmail.trim() || undefined,
        profilePic: custProfilePic,
        notes: customerNotes.trim() || undefined,
      });
      showToast('Client added to directory & saved to Cloud Storage!');
    }
    AdMobService.showInterstitial('customer_saved');

    setEditingCustomerId(null);
    setCustDirectoryName('');
    setCustomerLocation('');
    setCustomerContact('');
    setCustomerEmail('');
    setCustProfilePic(undefined);
    setCustomerNotes('');
    setShowAddCustomerForm(false);
    refreshData();
  };

  const handleEditCustomer = (cust: Customer) => {
    setEditingCustomerId(cust.id);
    setCustDirectoryName(cust.name);
    setCustomerLocation(cust.location || '');
    setCustomerContact(cust.contact);
    setCustomerEmail(cust.email || '');
    setCustProfilePic(cust.profilePic);
    setCustomerNotes(cust.notes || '');
    setShowAddCustomerForm(true);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    showConfirm(`Delete ${name}?`, 'Are you sure you want to remove this client?', () => {
      StorageService.deleteCustomer(id);
      refreshData();
      showToast('Client removed');
    });
  };

  const handleCancelCustomerForm = () => {
    setEditingCustomerId(null);
    setCustDirectoryName('');
    setCustomerLocation('');
    setCustomerContact('');
    setCustomerEmail('');
    setCustProfilePic(undefined);
    setCustomerNotes('');
    setShowAddCustomerForm(false);
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const q = customerSearchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.location && c.location.toLowerCase().includes(q)) ||
        c.contact.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    );
  }, [customers, customerSearchQuery]);

  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentNameInput.trim()) {
      showToast('Please enter agent name');
      return;
    }
    if (!agentContactInput.trim()) {
      showToast('Please enter contact / phone number');
      return;
    }

    if (editingAgentId) {
      StorageService.updateAgent(editingAgentId, {
        agentName: agentNameInput.trim(),
        shopName: agentShopNameInput.trim() || undefined,
        address: agentAddressInput.trim() || undefined,
        contact: agentContactInput.trim(),
        email: agentEmailInput.trim() || undefined,
        profilePic: agentProfilePic,
        notes: agentNotesInput.trim() || undefined,
      });
      showToast('Agent details updated & saved to Cloud Storage!');
    } else {
      StorageService.addAgent({
        agentName: agentNameInput.trim(),
        shopName: agentShopNameInput.trim() || undefined,
        address: agentAddressInput.trim() || undefined,
        contact: agentContactInput.trim(),
        email: agentEmailInput.trim() || undefined,
        profilePic: agentProfilePic,
        notes: agentNotesInput.trim() || undefined,
      });
      showToast('Agent added to directory & saved to Cloud Storage!');
    }
    AdMobService.showInterstitial('agent_saved');

    setEditingAgentId(null);
    setAgentNameInput('');
    setAgentShopNameInput('');
    setAgentAddressInput('');
    setAgentContactInput('');
    setAgentEmailInput('');
    setAgentProfilePic(undefined);
    setAgentNotesInput('');
    setShowAddAgentForm(false);
    refreshData();
  };

  const handleEditAgent = (agent: BusinessAgent) => {
    setEditingAgentId(agent.id);
    setAgentNameInput(agent.agentName);
    setAgentShopNameInput(agent.shopName || '');
    setAgentAddressInput(agent.address || '');
    setAgentContactInput(agent.contact);
    setAgentEmailInput(agent.email || '');
    setAgentProfilePic(agent.profilePic);
    setAgentNotesInput(agent.notes || '');
    setShowAddAgentForm(true);
  };

  const handleDeleteAgent = (id: string, name: string) => {
    showConfirm(`Delete ${name}?`, 'Are you sure you want to remove this agent?', () => {
      StorageService.deleteAgent(id);
      refreshData();
      showToast('Agent removed');
    });
  };

  const handleCancelAgentForm = () => {
    setEditingAgentId(null);
    setAgentNameInput('');
    setAgentShopNameInput('');
    setAgentAddressInput('');
    setAgentContactInput('');
    setAgentEmailInput('');
    setAgentProfilePic(undefined);
    setAgentNotesInput('');
    setShowAddAgentForm(false);
  };

  const filteredAgents = useMemo(() => {
    if (!agentSearchQuery.trim()) return agents;
    const q = agentSearchQuery.toLowerCase().trim();
    return agents.filter(
      (a) =>
        a.agentName.toLowerCase().includes(q) ||
        (a.shopName && a.shopName.toLowerCase().includes(q)) ||
        (a.address && a.address.toLowerCase().includes(q)) ||
        a.contact.toLowerCase().includes(q) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q))
    );
  }, [agents, agentSearchQuery]);

  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerNameInput.trim()) {
      showToast('Please enter staff name');
      return;
    }
    if (!workerPhoneInput.trim()) {
      showToast('Please enter phone / contact number');
      return;
    }

    const salaryNum = parseFloat(workerSalaryInput.replace(/,/g, '')) || 0;

    if (editingWorkerId) {
      StorageService.updateWorker(editingWorkerId, {
        name: workerNameInput.trim(),
        phone: workerPhoneInput.trim(),
        email: workerEmailInput.trim() || undefined,
        nin: workerNinInput.trim() || undefined,
        homeAddress: workerAddressInput.trim() || undefined,
        profilePic: workerProfilePic,
        startDate: workerStartDateInput.trim() || undefined,
        salary: salaryNum,
        salaryPeriod: workerSalaryPeriod,
        workDays: workerWorkDaysInput.trim() || undefined,
        workHours: workerWorkHoursInput.trim() || undefined,
        role: workerRoleInput.trim() || undefined,
        notes: workerNotesInput.trim() || undefined,
      });
      showToast('Staff details updated & saved to Cloud Storage!');
    } else {
      StorageService.addWorker({
        name: workerNameInput.trim(),
        phone: workerPhoneInput.trim(),
        email: workerEmailInput.trim() || undefined,
        nin: workerNinInput.trim() || undefined,
        homeAddress: workerAddressInput.trim() || undefined,
        profilePic: workerProfilePic,
        startDate: workerStartDateInput.trim() || undefined,
        salary: salaryNum,
        salaryPeriod: workerSalaryPeriod,
        workDays: workerWorkDaysInput.trim() || undefined,
        workHours: workerWorkHoursInput.trim() || undefined,
        role: workerRoleInput.trim() || undefined,
        notes: workerNotesInput.trim() || undefined,
      });
      showToast('Staff member added & saved to Cloud Storage!');
    }
    AdMobService.showInterstitial('staff_saved');

    setEditingWorkerId(null);
    setWorkerNameInput('');
    setWorkerPhoneInput('');
    setWorkerEmailInput('');
    setWorkerNinInput('');
    setWorkerAddressInput('');
    setWorkerProfilePic(undefined);
    setWorkerStartDateInput('');
    setWorkerSalaryInput('');
    setWorkerSalaryPeriod('monthly');
    setWorkerWorkDaysInput('');
    setWorkerWorkHoursInput('');
    setWorkerRoleInput('');
    setWorkerNotesInput('');
    setShowAddWorkerForm(false);
    refreshData();
  };

  const handleEditWorker = (w: BusinessWorker) => {
    setEditingWorkerId(w.id);
    setWorkerNameInput(w.name);
    setWorkerPhoneInput(w.phone);
    setWorkerEmailInput(w.email || '');
    setWorkerNinInput(w.nin || '');
    setWorkerAddressInput(w.homeAddress || '');
    setWorkerProfilePic(w.profilePic);
    setWorkerStartDateInput(w.startDate || '');
    setWorkerSalaryInput(w.salary ? String(w.salary) : '');
    setWorkerSalaryPeriod(w.salaryPeriod || 'monthly');
    setWorkerWorkDaysInput(w.workDays || '');
    setWorkerWorkHoursInput(w.workHours || '');
    setWorkerRoleInput(w.role || '');
    setWorkerNotesInput(w.notes || '');
    setShowAddWorkerForm(true);
  };

  const handleDeleteWorker = (id: string, name: string) => {
    showConfirm(`Delete Staff Member ${name}?`, 'Are you sure you want to remove this staff profile?', () => {
      StorageService.deleteWorker(id);
      refreshData();
      showToast('Staff member removed');
    });
  };

  const handleCancelWorkerForm = () => {
    setEditingWorkerId(null);
    setWorkerNameInput('');
    setWorkerPhoneInput('');
    setWorkerEmailInput('');
    setWorkerNinInput('');
    setWorkerAddressInput('');
    setWorkerProfilePic(undefined);
    setWorkerStartDateInput('');
    setWorkerSalaryInput('');
    setWorkerSalaryPeriod('monthly');
    setWorkerWorkDaysInput('');
    setWorkerWorkHoursInput('');
    setWorkerRoleInput('');
    setWorkerNotesInput('');
    setShowAddWorkerForm(false);
  };

  const filteredWorkers = useMemo(() => {
    if (!workerSearchQuery.trim()) return workers;
    const q = workerSearchQuery.toLowerCase().trim();
    return workers.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.phone.toLowerCase().includes(q) ||
        (w.email && w.email.toLowerCase().includes(q)) ||
        (w.nin && w.nin.toLowerCase().includes(q)) ||
        (w.homeAddress && w.homeAddress.toLowerCase().includes(q)) ||
        (w.role && w.role.toLowerCase().includes(q)) ||
        (w.workDays && w.workDays.toLowerCase().includes(q)) ||
        (w.workHours && w.workHours.toLowerCase().includes(q)) ||
        (w.notes && w.notes.toLowerCase().includes(q))
    );
  }, [workers, workerSearchQuery]);

  const totalMonthlyPayroll = useMemo(() => {
    return workers.reduce((acc, w) => {
      const sal = w.salary || 0;
      if (w.salaryPeriod === 'daily') return acc + sal * 26;
      if (w.salaryPeriod === 'weekly') return acc + sal * 4.33;
      return acc + sal;
    }, 0);
  }, [workers]);

  /* -------------------------------------------------------------------------- */
  /* TAB 1: ADD PRODUCT FORM STATE                                              */
  /* -------------------------------------------------------------------------- */
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string>(() => StorageService.getNextInventoryItemId());
  const [name, setName] = useState<string>('');
  const [productCategoryId, setProductCategoryId] = useState<string>('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [showSizes, setShowSizes] = useState<boolean>(false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [customSizeInput, setCustomSizeInput] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [costPrice, setCostPrice] = useState<string>('0.0');
  const [sellingPrice, setSellingPrice] = useState<string>('0.0');
  const [taxPercent, setTaxPercent] = useState<string>('0');
  const [isCompressingImage, setIsCompressingImage] = useState<boolean>(false);
  const [showInlineCategoryInput, setShowInlineCategoryInput] = useState<boolean>(false);
  const [quickCategoryName, setQuickCategoryName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoGenerateItemId = () => {
    const nextId = StorageService.getNextInventoryItemId();
    setItemId(nextId);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressingImage(true);
      const compressed = await compressImageFile(file, { maxDimension: 320, quality: 0.68 });
      setImage(compressed);

      // Upload to Cloudflare R2 first
      try {
        const uploadRes = await CloudflareService.uploadFile({
          data: compressed,
          filename: `product_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          folder: 'photos',
        });
        if (uploadRes.success && uploadRes.url) {
          setImage(uploadRes.url);
          showToast('Product photo saved to Cloud Storage!');
        }
      } catch (cfErr) {
        console.warn('Cloudflare product photo upload note:', cfErr);
      }
    } catch (err) {
      console.warn('Failed to compress image:', err);
      showToast('Could not process photo');
    } finally {
      setIsCompressingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleSizeTag = (sizeTag: string) => {
    if (selectedSizes.includes(sizeTag)) {
      setSelectedSizes(selectedSizes.filter((s) => s !== sizeTag));
    } else {
      setSelectedSizes([...selectedSizes, sizeTag]);
    }
  };

  const removeSizeTag = (sizeTag: string) => {
    setSelectedSizes((prev) => prev.filter((s) => s !== sizeTag));
  };

  const addSizesFromInput = () => {
    if (!customSizeInput.trim()) return;
    // Split by commas, semicolons, slashes, or newlines to allow adding multiple sizes at once
    const parsed = customSizeInput
      .split(/[,;\n/]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (parsed.length === 0) return;

    const nextSizes = [...selectedSizes];
    for (const size of parsed) {
      if (!nextSizes.includes(size)) {
        nextSizes.push(size);
      }
    }
    setSelectedSizes(nextSizes);
    setCustomSizeInput('');
  };

  const addPresetGroup = (group: string[]) => {
    const nextSizes = [...selectedSizes];
    for (const size of group) {
      if (!nextSizes.includes(size)) {
        nextSizes.push(size);
      }
    }
    setSelectedSizes(nextSizes);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter an item name');
      return;
    }

    const targetItemId = itemId.trim() || StorageService.getNextInventoryItemId();

    // Prevent duplicate product Item ID
    const duplicateProduct = products.find(
      (p) => p.itemId.trim().toLowerCase() === targetItemId.toLowerCase() && p.id !== editingProductId
    );

    if (duplicateProduct) {
      showToast(`Cannot add product: Item ID "${targetItemId}" is already used by "${duplicateProduct.name}".`);
      return;
    }

    const cost = parseFloat(costPrice) || 0;
    const selling = parseFloat(sellingPrice) || 0;
    const tax = parseFloat(taxPercent) || 0;

    const product: InventoryProduct = {
      id: editingProductId || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId: targetItemId,
      name: name.trim(),
      image,
      sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
      quantity: Math.max(0, quantity),
      costPrice: cost,
      sellingPrice: selling,
      taxPercent: tax,
      categoryId: productCategoryId || undefined,
      createdAt: editingProductId ? (products.find((p) => p.id === editingProductId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = StorageService.saveInventoryProduct(product);
    refreshData();

    if (saved) {
      showToast(editingProductId ? 'Product updated & saved to Cloud Storage!' : 'Product saved to Cloud Storage & inventory!');
      AdMobService.showInterstitial('product_saved');
    } else {
      showToast(`Could not save: Product with ID "${targetItemId}" already exists.`);
      return;
    }

    // Reset form
    setEditingProductId(null);
    setName('');
    setProductCategoryId('');
    setImage(undefined);
    setSelectedSizes([]);
    setShowSizes(false);
    setQuantity(1);
    setCostPrice('0.0');
    setSellingPrice('0.0');
    setTaxPercent('0');
    setItemId(StorageService.getNextInventoryItemId());
    setShowAddProductInline(false);
    setShowInlineCategoryInput(false);
    setQuickCategoryName('');
  };

  const handleCreateQuickCategory = () => {
    if (!quickCategoryName.trim()) {
      showToast('Please enter a category name');
      return;
    }
    const exists = productCategories.some(
      (c) => c.name.toLowerCase() === quickCategoryName.trim().toLowerCase()
    );
    if (exists) {
      showToast('Category already exists.');
      const existingCat = productCategories.find(
        (c) => c.name.toLowerCase() === quickCategoryName.trim().toLowerCase()
      );
      if (existingCat) {
        setProductCategoryId(existingCat.id);
      }
      setQuickCategoryName('');
      setShowInlineCategoryInput(false);
      return;
    }

    const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f97316'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const created = StorageService.addProductCategory(quickCategoryName.trim(), randomColor);
    setQuickCategoryName('');
    setShowInlineCategoryInput(false);
    refreshData();
    setProductCategoryId(created.id);
    showToast(`Category "${created.name}" created and selected!`);
  };

  const startEditProduct = (prod: InventoryProduct) => {
    setEditingProductId(prod.id);
    setItemId(prod.itemId);
    setName(prod.name);
    setProductCategoryId(prod.categoryId || '');
    setImage(prod.image);
    setSelectedSizes(prod.sizes || []);
    setShowSizes((prod.sizes && prod.sizes.length > 0) || false);
    setQuantity(prod.quantity);
    setCostPrice(String(prod.costPrice));
    setSellingPrice(String(prod.sellingPrice));
    setTaxPercent(String(prod.taxPercent || 0));
    setShowAddProductInline(true);
    setActiveTab('stock');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* -------------------------------------------------------------------------- */
  /* TAB 2: SALES FORM STATE                                                    */
  /* -------------------------------------------------------------------------- */
  const [saleDate, setSaleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedProductForSale, setSelectedProductForSale] = useState<InventoryProduct | null>(null);
  const [saleItemId, setSaleItemId] = useState<string>('');
  const [saleSearchQuery, setSaleSearchQuery] = useState<string>('');
  const [saleSelectedSize, setSaleSelectedSize] = useState<string>('');
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [saleSoldPrice, setSaleSoldPrice] = useState<string>('0.0');
  const [saleCategoryId, setSaleCategoryId] = useState<string>('');
  const [showSaleCategoryInput, setShowSaleCategoryInput] = useState<boolean>(false);
  const [saleQuickCategoryName, setSaleQuickCategoryName] = useState<string>('');
  const [showAddCustomer, setShowAddCustomer] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [saleSortOrder, setSaleSortOrder] = useState<'latest' | 'amount'>('latest');
  const [saleFilterQuery, setSaleFilterQuery] = useState<string>('');
  const [saleDateFilter, setSaleDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | 'all'>('all');
  const [saleCustomFilterDate, setSaleCustomFilterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showSaleForm, setShowSaleForm] = useState<boolean>(false);

  /* -------------------------------------------------------------------------- */
  /* TAB 4: EXPENSES FORM & FILTER STATE                                        */
  /* -------------------------------------------------------------------------- */
  const [expenseTitle, setExpenseTitle] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseNotes, setExpenseNotes] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [expenseFilter, setExpenseFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [showExpenseForm, setShowExpenseForm] = useState<boolean>(false);

  const totalRecordedExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  const getExpenseDateStr = (exp: InventoryExpense): string => {
    if (exp.date && exp.date.length >= 10) return exp.date.substring(0, 10);
    if (exp.createdAt && exp.createdAt.length >= 10) return exp.createdAt.substring(0, 10);
    return '';
  };

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${curYear}-${curMonth}-${curDay}`;

    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday);
    const sunday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday + 6);
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    const thisMonthStr = `${curYear}-${curMonth}`;
    const thisYearStr = `${curYear}`;

    return expenses.filter((exp) => {
      const d = getExpenseDateStr(exp);
      if (!d) return expenseFilter === 'all';
      if (expenseFilter === 'today') return d === todayStr;
      if (expenseFilter === 'week') return d >= mondayStr && d <= sundayStr;
      if (expenseFilter === 'month') return d.startsWith(thisMonthStr);
      if (expenseFilter === 'year') return d.startsWith(thisYearStr);
      return true;
    });
  }, [expenses, expenseFilter]);

  const filteredExpensesTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  const filteredPeriodSalesTotal = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${curYear}-${curMonth}-${curDay}`;

    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday);
    const sunday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday + 6);
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    const thisMonthStr = `${curYear}-${curMonth}`;
    const thisYearStr = `${curYear}`;

    return sales.reduce((sum, s) => {
      const sDate = (s.date && s.date.length >= 10) ? s.date.substring(0, 10) : (s.createdAt ? s.createdAt.substring(0, 10) : '');
      if (!sDate) return expenseFilter === 'all' ? sum + (s.totalPrice || 0) : sum;
      let match = false;
      if (expenseFilter === 'today') match = sDate === todayStr;
      else if (expenseFilter === 'week') match = sDate >= mondayStr && sDate <= sundayStr;
      else if (expenseFilter === 'month') match = sDate.startsWith(thisMonthStr);
      else if (expenseFilter === 'year') match = sDate.startsWith(thisYearStr);
      else match = true;
      return match ? sum + (s.totalPrice || 0) : sum;
    }, 0);
  }, [sales, expenseFilter]);

  const filteredNetProfit = useMemo(() => {
    return filteredPeriodSalesTotal - filteredExpensesTotal;
  }, [filteredPeriodSalesTotal, filteredExpensesTotal]);

  const handleCreateSaleQuickCategory = () => {
    if (!saleQuickCategoryName.trim()) {
      showToast('Please enter a category name');
      return;
    }
    const exists = productCategories.some(
      (c) => c.name.toLowerCase() === saleQuickCategoryName.trim().toLowerCase()
    );
    if (exists) {
      showToast('Category already exists.');
      const existingCat = productCategories.find(
        (c) => c.name.toLowerCase() === saleQuickCategoryName.trim().toLowerCase()
      );
      if (existingCat) {
        setSaleCategoryId(existingCat.id);
      }
      setSaleQuickCategoryName('');
      setShowSaleCategoryInput(false);
      return;
    }

    const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f97316'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const created = StorageService.addProductCategory(saleQuickCategoryName.trim(), randomColor);
    setSaleQuickCategoryName('');
    setShowSaleCategoryInput(false);
    refreshData();
    setSaleCategoryId(created.id);
    showToast(`Category "${created.name}" created and selected!`);
  };

  const handleCreateDebtQuickCategory = () => {
    if (!debtQuickCategoryName.trim()) {
      showToast('Please enter a category name');
      return;
    }
    const exists = productCategories.some(
      (c) => c.name.toLowerCase() === debtQuickCategoryName.trim().toLowerCase()
    );
    if (exists) {
      showToast('Category already exists.');
      const existingCat = productCategories.find(
        (c) => c.name.toLowerCase() === debtQuickCategoryName.trim().toLowerCase()
      );
      if (existingCat) {
        setDebtCategoryId(existingCat.id);
      }
      setDebtQuickCategoryName('');
      setShowDebtCategoryInput(false);
      return;
    }

    const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f97316'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const created = StorageService.addProductCategory(debtQuickCategoryName.trim(), randomColor);
    setDebtQuickCategoryName('');
    setShowDebtCategoryInput(false);
    refreshData();
    setDebtCategoryId(created.id);
    showToast(`Category "${created.name}" created and selected!`);
  };

  // Handle product selection in sale form
  const handleSelectProductForSale = (prod: InventoryProduct) => {
    setSelectedProductForSale(prod);
    setSaleItemId(prod.itemId);
    setSaleSearchQuery(prod.name);
    setSaleSelectedSize('');
    if (prod.categoryId) {
      setSaleCategoryId(prod.categoryId);
    }
    const qty = saleQuantity || 1;
    setSaleSoldPrice(String(prod.sellingPrice * qty));
    setShowSaleForm(true);
  };

  // Handle direct Product ID input
  const handleSaleItemIdChange = (val: string) => {
    setSaleItemId(val);
    const trimmed = val.trim();
    if (!trimmed) {
      if (selectedProductForSale) {
        setSelectedProductForSale(null);
      }
      return;
    }
    const match = products.find(
      (p) => p.itemId.toLowerCase() === trimmed.toLowerCase()
    );
    if (match) {
      setSelectedProductForSale(match);
      setSaleSearchQuery(match.name);
      setSaleSelectedSize('');
      if (match.categoryId) {
        setSaleCategoryId(match.categoryId);
      }
      const qty = saleQuantity || 1;
      setSaleSoldPrice(String(match.sellingPrice * qty));
    }
  };

  // Recalculate sold total when quantity changes
  const handleSaleQuantityChange = (newQty: number) => {
    const validQty = Math.max(1, newQty);
    setSaleQuantity(validQty);
    if (selectedProductForSale) {
      setSaleSoldPrice(String(selectedProductForSale.sellingPrice * validQty));
    }
  };

  const handleRecordSale = (e: React.FormEvent) => {
    e.preventDefault();
    const totalSold = parseFloat(saleSoldPrice) || 0;
    if (totalSold <= 0 && !selectedProductForSale && !saleSearchQuery.trim()) {
      showToast('Please select a product or enter a sale description');
      return;
    }

    const sizeNote = saleSelectedSize ? ` (Size: ${saleSelectedSize})` : '';
    const baseProdName = selectedProductForSale?.name || saleSearchQuery.trim() || 'General Sale';
    const prodName = `${baseProdName}${sizeNote}`;
    const cost = (selectedProductForSale?.costPrice || 0) * saleQuantity;
    const profit = totalSold - cost;

    const remainingStockAfterSale = selectedProductForSale
      ? Math.max(0, selectedProductForSale.quantity - saleQuantity)
      : undefined;

    StorageService.recordInventorySale({
      productId: selectedProductForSale?.id,
      itemId: saleItemId.trim() || selectedProductForSale?.itemId,
      productName: prodName,
      quantity: saleQuantity,
      costPrice: selectedProductForSale?.costPrice || 0,
      sellingPrice: totalSold / saleQuantity,
      totalPrice: totalSold,
      profit,
      customerName: customerName.trim() || undefined,
      categoryId: saleCategoryId || selectedProductForSale?.categoryId || undefined,
      date: saleDate,
      remainingStock: remainingStockAfterSale,
    });

    refreshData();
    if (selectedProductForSale) {
      showToast(
        `Sale recorded & saved to Cloud Storage! ${saleQuantity} ${selectedProductForSale.name} sold • ${remainingStockAfterSale} left in stock.`
      );
    } else {
      showToast('Sale recorded & saved to Cloud Storage!');
    }
    AdMobService.showInterstitial('sale_recorded');

    // Reset sale form
    setSelectedProductForSale(null);
    setSaleItemId('');
    setSaleSearchQuery('');
    setSaleSelectedSize('');
    setSaleQuantity(1);
    setSaleSoldPrice('0.0');
    setSaleCategoryId('');
    setShowSaleCategoryInput(false);
    setSaleQuickCategoryName('');
    setCustomerName('');
    setShowAddCustomer(false);
    setShowSaleForm(false);
  };

  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseAmount) || 0;
    if (!expenseTitle.trim() || amount <= 0) {
      showToast('Please enter expense title and valid amount');
      return;
    }

    StorageService.recordInventoryExpense({
      title: expenseTitle.trim(),
      amount,
      notes: expenseNotes.trim() || undefined,
      date: expenseDate,
    });

    refreshData();
    showToast('Expense recorded & saved to Cloud Storage!');
    AdMobService.showInterstitial('expense_recorded');

    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseNotes('');
    setShowExpenseForm(false);
  };

  const handleDeleteExpense = (id: string, title: string) => {
    showConfirm(
      'Confirm Deletion',
      `Delete expense "${title}"?`,
      () => {
        StorageService.deleteInventoryExpense(id);
        refreshData();
        showToast('Expense deleted.');
      }
    );
  };

  /* -------------------------------------------------------------------------- */
  /* TAB 5: DEBTS & DEMANDS FORM & FILTER STATE                                 */
  /* -------------------------------------------------------------------------- */
  const [debtCustomerName, setDebtCustomerName] = useState<string>('');
  const [debtPhone, setDebtPhone] = useState<string>('');
  const [debtProductTaken, setDebtProductTaken] = useState<string>('');
  const [debtAmount, setDebtAmount] = useState<string>('');
  const [debtDescription, setDebtDescription] = useState<string>('');
  const [debtCategoryId, setDebtCategoryId] = useState<string>('');
  const [showDebtCategoryInput, setShowDebtCategoryInput] = useState<boolean>(false);
  const [debtQuickCategoryName, setDebtQuickCategoryName] = useState<string>('');
  const [debtDate, setDebtDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [debtDueDate, setDebtDueDate] = useState<string>('');
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [showDebtForm, setShowDebtForm] = useState<boolean>(false);
  const [settleDebtModalOpen, setSettleDebtModalOpen] = useState<boolean>(false);
  const [debtToSettle, setDebtToSettle] = useState<InventoryDebt | null>(null);
  const [settleType, setSettleType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [debtStatusFilter, setDebtStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [debtTimeFilter, setDebtTimeFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | 'all'>('all');
  const [debtCustomFilterDate, setDebtCustomFilterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [debtSearchQuery, setDebtSearchQuery] = useState<string>('');
  const [expandedDebts, setExpandedDebts] = useState<Record<string, boolean>>({});
  const [debtStockPickerOpen, setDebtStockPickerOpen] = useState<boolean>(false);
  const [debtStockSearchQuery, setDebtStockSearchQuery] = useState<string>('');

  const timeFilteredDebts = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${curYear}-${curMonth}-${curDay}`;

    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const mondayStr = monday.toISOString().split('T')[0];

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sundayStr = sunday.toISOString().split('T')[0];

    const thisMonthStr = `${curYear}-${curMonth}`;
    const thisYearStr = `${curYear}`;

    return debts.filter((d) => {
      const dateStr = (d.date && d.date.length >= 10) ? d.date.substring(0, 10) : (d.createdAt ? d.createdAt.substring(0, 10) : '');
      if (!dateStr) return debtTimeFilter === 'all';
      if (debtTimeFilter === 'today') return dateStr === todayStr;
      if (debtTimeFilter === 'week') return dateStr >= mondayStr && dateStr <= sundayStr;
      if (debtTimeFilter === 'month') return dateStr.startsWith(thisMonthStr);
      if (debtTimeFilter === 'year') return dateStr.startsWith(thisYearStr);
      if (debtTimeFilter === 'custom') return dateStr === debtCustomFilterDate;
      return true;
    });
  }, [debts, debtTimeFilter, debtCustomFilterDate]);

  const totalOutstandingDebts = useMemo(() => {
    return timeFilteredDebts
      .filter((d) => d.status !== 'paid')
      .reduce((sum, d) => sum + Math.max(0, d.amount - (d.paidAmount || 0)), 0);
  }, [timeFilteredDebts]);

  const totalRecoveredDebts = useMemo(() => {
    return timeFilteredDebts.reduce((sum, d) => sum + (d.paidAmount || (d.status === 'paid' ? d.amount : 0)), 0);
  }, [timeFilteredDebts]);

  const unpaidDebtsCount = useMemo(() => {
    return timeFilteredDebts.filter((d) => d.status !== 'paid').length;
  }, [timeFilteredDebts]);

  const filteredDebts = useMemo(() => {
    return timeFilteredDebts.filter((d) => {
      if (debtStatusFilter === 'unpaid' && d.status === 'paid') return false;
      if (debtStatusFilter === 'paid' && d.status !== 'paid') return false;
      if (debtSearchQuery.trim()) {
        const q = debtSearchQuery.toLowerCase();
        const matchName = d.customerName.toLowerCase().includes(q);
        const matchPhone = (d.phone || '').toLowerCase().includes(q);
        const matchProduct = d.productTaken.toLowerCase().includes(q);
        const matchDesc = (d.description || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchProduct && !matchDesc) return false;
      }
      return true;
    });
  }, [timeFilteredDebts, debtStatusFilter, debtSearchQuery]);

  const handleSaveDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtCustomerName.trim()) {
      showToast('Please enter customer name');
      return;
    }
    if (!debtProductTaken.trim()) {
      showToast('Please specify the product taken');
      return;
    }
    const amount = parseFloat(debtAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount');
      return;
    }

    if (editingDebtId) {
      StorageService.updateInventoryDebt(editingDebtId, {
        customerName: debtCustomerName.trim(),
        phone: debtPhone.trim(),
        productTaken: debtProductTaken.trim(),
        amount,
        description: debtDescription.trim() || undefined,
        categoryId: debtCategoryId || undefined,
        date: debtDate,
        dueDate: debtDueDate || undefined,
      });
      showToast(`Debt record for ${debtCustomerName} updated & saved to Cloud Storage!`);
      setEditingDebtId(null);
      setShowDebtForm(false);
    } else {
      StorageService.recordInventoryDebt({
        customerName: debtCustomerName.trim(),
        phone: debtPhone.trim(),
        productTaken: debtProductTaken.trim(),
        amount,
        description: debtDescription.trim() || undefined,
        categoryId: debtCategoryId || undefined,
        date: debtDate,
        dueDate: debtDueDate || undefined,
        status: 'unpaid',
        paidAmount: 0,
      });
      showToast(`Debt for ${debtCustomerName} recorded & saved to Cloud Storage!`);
      setShowDebtForm(false);
    }
    AdMobService.showInterstitial('debt_recorded');

    // Reset form
    setDebtCustomerName('');
    setDebtPhone('');
    setDebtProductTaken('');
    setDebtAmount('');
    setDebtDescription('');
    setDebtCategoryId('');
    setShowDebtCategoryInput(false);
    setDebtQuickCategoryName('');
    setDebtDate(new Date().toISOString().split('T')[0]);
    setDebtDueDate('');
    refreshData();
  };

  const startEditDebt = (debt: InventoryDebt) => {
    setEditingDebtId(debt.id);
    setShowDebtForm(true);
    setDebtCustomerName(debt.customerName);
    setDebtPhone(debt.phone || '');
    setDebtProductTaken(debt.productTaken || '');
    setDebtAmount(String(debt.amount));
    setDebtDescription(debt.description || '');
    setDebtCategoryId(debt.categoryId || '');
    setShowDebtCategoryInput(false);
    setDebtQuickCategoryName('');
    setDebtDate(debt.date || new Date().toISOString().split('T')[0]);
    setDebtDueDate(debt.dueDate || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditDebt = () => {
    setEditingDebtId(null);
    setShowDebtForm(false);
    setDebtCustomerName('');
    setDebtPhone('');
    setDebtProductTaken('');
    setDebtAmount('');
    setDebtDescription('');
    setDebtCategoryId('');
    setShowDebtCategoryInput(false);
    setDebtQuickCategoryName('');
    setDebtDate(new Date().toISOString().split('T')[0]);
    setDebtDueDate('');
    setDebtStockPickerOpen(false);
    setDebtStockSearchQuery('');
  };

  const handleDeleteDebt = (id: string, name: string) => {
    showConfirm(
      'Confirm Deletion',
      `Delete debt record for "${name}"?`,
      () => {
        StorageService.deleteInventoryDebt(id);
        refreshData();
        showToast('Debt record deleted.');
      }
    );
  };

  const handleToggleDebtStatus = (debt: InventoryDebt) => {
    if (debt.status === 'paid') {
      StorageService.updateInventoryDebt(debt.id, {
        status: 'unpaid',
        paidAmount: 0,
        settledAt: undefined,
        payments: []
      });
      refreshData();
      showToast(`Marked ${debt.customerName}'s debt as UNPAID and cleared payment history.`);
    } else {
      setDebtToSettle(debt);
      setSettleType('full');
      setPartialAmount('');
      setSettleDebtModalOpen(true);
    }
  };

  const submitDebtSettlement = () => {
    if (!debtToSettle) return;
    
    const now = new Date().toISOString();
    const currentPayments = debtToSettle.payments || [];
    
    if (settleType === 'full') {
      const remainingAmount = Math.max(0, debtToSettle.amount - (debtToSettle.paidAmount || 0));
      const newPayment = { amount: remainingAmount, date: now };
      
      StorageService.updateInventoryDebt(debtToSettle.id, {
        status: 'paid',
        paidAmount: debtToSettle.amount,
        settledAt: now,
        payments: [...currentPayments, newPayment]
      });
      refreshData();
      showToast(`Marked ${debtToSettle.customerName}'s debt as fully PAID & synced to Cloud Storage!`);
    } else {
      const pAmt = parseFloat(partialAmount) || 0;
      if (pAmt <= 0) {
        showToast('Please enter a valid partial amount.');
        return;
      }
      
      const newPayment = { amount: pAmt, date: now };
      const currentPaid = debtToSettle.paidAmount || 0;
      const newPaidTotal = currentPaid + pAmt;
      const remaining = debtToSettle.amount - newPaidTotal;
      
      if (remaining <= 0) {
        StorageService.updateInventoryDebt(debtToSettle.id, {
          status: 'paid',
          paidAmount: debtToSettle.amount,
          settledAt: now,
          payments: [...currentPayments, newPayment]
        });
        refreshData();
        showToast(`Marked ${debtToSettle.customerName}'s debt as fully PAID & synced to Cloud Storage!`);
      } else {
        StorageService.updateInventoryDebt(debtToSettle.id, {
          paidAmount: newPaidTotal,
          status: 'partial',
          payments: [...currentPayments, newPayment]
        });
        refreshData();
        showToast(`Recorded payment of ${currency} ${pAmt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} for ${debtToSettle.customerName} & synced to Cloud Storage!`);
      }
    }
    setSettleDebtModalOpen(false);
    setDebtToSettle(null);
  };

  const handleSendDebtReminderWhatsApp = (debt: InventoryDebt) => {
    let cleanPhone = (debt.phone || '').replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '256' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.substring(1);
    }

    const remainingAmount = Math.max(0, debt.amount - (debt.paidAmount || 0));
    const formattedDate = debt.date ? new Date(debt.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'recently';
    const formattedDueDate = debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    
    const reminderText = `Hello ${debt.customerName},\n\nThis is a friendly reminder from *${business.name || 'our shop'}* regarding the pending balance of *${currency} ${remainingAmount.toLocaleString()}* for *${debt.productTaken}* taken on ${formattedDate}.${formattedDueDate ? `\nPayment Due Date: ${formattedDueDate}` : ''}\n\n*Payment Details:*\n${business.mobileMoneyMerchant ? `• Mobile Money: ${business.mobileMoneyMerchant} (${business.mobileMoneyName || ''})\n` : ''}${business.bankAccountNumber ? `• Bank: ${business.bankName || ''} - A/C: ${business.bankAccountNumber}\n` : ''}${business.phone ? `• Contact: ${business.phone}\n` : ''}\nKindly clear the balance at your earliest convenience. Thank you!`;

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminderText)}`, '_blank');
    } else {
      navigator.clipboard?.writeText(reminderText);
      showToast('Debtor phone missing. Reminder message copied to clipboard!');
    }
  };

  const handleDeleteSale = (id: string) => {
    if (id.startsWith('staff_')) {
      const staffSaleId = id.replace('staff_', '');
      showConfirm(
        'Confirm Deletion',
        'Delete this staff sale record?',
        () => {
          StorageService.deleteStaffSale(staffSaleId);
          refreshData();
          showToast('Staff sale record removed.');
        }
      );
      return;
    }
    showConfirm(
      'Confirm Deletion',
      'Delete this sale record? (Stock will be restored to inventory)',
      () => {
        StorageService.deleteInventorySale(id, true);
        refreshData();
        showToast('Sale removed and stock restored.');
      }
    );
  };

  /* -------------------------------------------------------------------------- */
  /* TAB 3: STOCK STATE                                                         */
  /* -------------------------------------------------------------------------- */
  const [stockSearch, setStockSearch] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low' | 'out'>('all');
  const [restockModalProduct, setRestockModalProduct] = useState<InventoryProduct | null>(null);
  const [restockQtyInput, setRestockQtyInput] = useState<number>(5);
  const [sellModalProduct, setSellModalProduct] = useState<InventoryProduct | null>(null);
  const [sellQtyInput, setSellQtyInput] = useState<number>(1);

  const stockAnalytics = useMemo(() => {
    let totalItems = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;

    products.forEach((p) => {
      totalItems += p.quantity;
      totalCostValue += p.costPrice * p.quantity;
      totalRetailValue += p.sellingPrice * p.quantity;
    });

    return {
      totalItems,
      totalCostValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalCostValue,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
        p.itemId.toLowerCase().includes(stockSearch.toLowerCase());
      if (!matchSearch) return false;

      // Filter by stock level status
      if (stockFilter === 'in-stock' && p.quantity <= 0) return false;
      if (stockFilter === 'low' && (p.quantity <= 0 || p.quantity >= 5)) return false;
      if (stockFilter === 'out' && p.quantity !== 0) return false;

      // Filter by productCategoryFilter
      if (productCategoryFilter !== 'all') {
        const itemCatId = p.categoryId || '';
        if (itemCatId !== productCategoryFilter) return false;
      }

      return true;
    });
  }, [products, stockSearch, stockFilter, productCategoryFilter]);

  const handleConfirmRestock = () => {
    if (restockModalProduct && restockQtyInput > 0) {
      StorageService.adjustInventoryProductStock(restockModalProduct.id, restockQtyInput);
      refreshData();
      showToast(`Added +${restockQtyInput} units to ${restockModalProduct.name}!`);
      setRestockModalProduct(null);
    }
  };

  const handleConfirmSell = () => {
    if (sellModalProduct && sellQtyInput > 0) {
      if (sellModalProduct.quantity < sellQtyInput) {
        showToast('Not enough items in stock!');
        return;
      }
      const profit = (sellModalProduct.sellingPrice - sellModalProduct.costPrice) * sellQtyInput;
      StorageService.recordInventorySale({
        productId: sellModalProduct.id,
        itemId: sellModalProduct.itemId,
        productName: sellModalProduct.name,
        quantity: sellQtyInput,
        costPrice: sellModalProduct.costPrice,
        sellingPrice: sellModalProduct.sellingPrice,
        totalPrice: sellModalProduct.sellingPrice * sellQtyInput,
        profit,
        date: new Date().toISOString().split('T')[0],
      });
      refreshData();
      showToast(`${sellQtyInput} unit(s) of ${sellModalProduct.name} sold!`);
      setSellModalProduct(null);
    }
  };

  const handleDeleteProduct = (id: string, prodName: string) => {
    showConfirm(
      'Confirm Deletion',
      `Are you sure you want to delete "${prodName}" from inventory?`,
      () => {
        StorageService.deleteInventoryProduct(id);
        refreshData();
        showToast('Product deleted.');
      }
    );
  };

  const handleCreateProductCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductCategoryName.trim()) {
      showToast('Please enter a category name');
      return;
    }
    const exists = productCategories.some(
      (c) => c.name.toLowerCase() === newProductCategoryName.trim().toLowerCase()
    );
    if (exists) {
      showToast('Category already exists.');
      return;
    }

    const created = StorageService.addProductCategory(newProductCategoryName.trim(), newProductCategoryColor);
    setNewProductCategoryName('');
    setShowProductCategoryForm(false);
    refreshData();
    showToast(`Category "${created.name}" created & saved to Cloud Storage!`);
  };

  const handleDeleteProductCategory = (id: string, name: string) => {
    showConfirm(
      'Delete Category',
      `Are you sure you want to delete "${name}"? Products in this category will become Uncategorized.`,
      () => {
        StorageService.deleteProductCategory(id);
        if (productCategoryFilter === id) {
          setProductCategoryFilter('all');
        }
        refreshData();
        showToast('Category deleted.');
      }
    );
  };

  /* -------------------------------------------------------------------------- */
  /* TAB 6: SHOPPING LIST STATE & HANDLERS                                      */
  /* -------------------------------------------------------------------------- */
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      showToast('Please enter a category name');
      return;
    }
    const exists = shoppingCategories.some(
      (c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    );
    if (exists) {
      showToast('Category already exists.');
      return;
    }

    const created = StorageService.addShoppingCategory(newCategoryName.trim(), newCategoryColor);
    setNewCategoryName('');
    setShowNewCategoryInline(false);
    refreshData();
    setShoppingItemCategoryId(created.id);
    showToast(`Category "${created.name}" created & saved to Cloud Storage!`);
  };

  const handleDeleteCategory = (id: string, name: string) => {
    showConfirm(
      'Delete Category',
      `Delete category "${name}"? Items in this category will become uncategorized.`,
      () => {
        StorageService.deleteShoppingCategory(id);
        refreshData();
        if (shoppingCategoryFilter === id) {
          setShoppingCategoryFilter('all');
        }
        if (shoppingItemCategoryId === id) {
          setShoppingItemCategoryId('');
        }
        showToast(`Category "${name}" deleted.`);
      }
    );
  };

  const handleSaveShoppingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shoppingItemName.trim()) {
      showToast('Please enter item name');
      return;
    }
    const qty = shoppingItemQty.trim() || '1';
    const estPrice = parseFloat(shoppingItemEstPrice) || undefined;

    if (editingShoppingId) {
      StorageService.updateShoppingListItem(editingShoppingId, {
        name: shoppingItemName.trim(),
        quantity: qty,
        estimatedPrice: estPrice,
        notes: shoppingItemNotes.trim() || undefined,
        categoryId: shoppingItemCategoryId || undefined,
      });
      showToast('Shopping item updated & saved to Cloud Storage!');
    } else {
      StorageService.addShoppingListItem({
        name: shoppingItemName.trim(),
        quantity: qty,
        estimatedPrice: estPrice,
        notes: shoppingItemNotes.trim() || undefined,
        categoryId: shoppingItemCategoryId || undefined,
      });
      showToast('Item added to shopping list & saved to Cloud Storage!');
    }
    AdMobService.showInterstitial('shopping_item_saved');

    cancelEditShoppingItem();
    refreshData();
  };

  const startEditShoppingItem = (item: ShoppingListItem) => {
    setEditingShoppingId(item.id);
    setShowShoppingForm(true);
    setShoppingItemName(item.name);
    setShoppingItemQty(item.quantity);
    setShoppingItemEstPrice(item.estimatedPrice !== undefined ? String(item.estimatedPrice) : '');
    setShoppingItemNotes(item.notes || '');
    setShoppingItemCategoryId(item.categoryId || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditShoppingItem = () => {
    setEditingShoppingId(null);
    setShowShoppingForm(false);
    setShoppingItemName('');
    setShoppingItemQty('');
    setShoppingItemEstPrice('');
    setShoppingItemNotes('');
    setShoppingItemCategoryId('');
    setShowNewCategoryInline(false);
    setNewCategoryName('');
  };

  const handleDeleteShoppingItem = (id: string, name: string) => {
    showConfirm(
      'Confirm Deletion',
      `Remove "${name}" from your shopping list?`,
      () => {
        StorageService.deleteShoppingListItem(id);
        refreshData();
        showToast('Item removed.');
      }
    );
  };

  const handleToggleShoppingItemChecked = (id: string, checked: boolean) => {
    StorageService.updateShoppingListItem(id, { checked });
    refreshData();
  };

  const handleClearCheckedShoppingItems = () => {
    showConfirm(
      'Clear Completed Items',
      'Are you sure you want to clear all completed items from your shopping list?',
      () => {
        StorageService.clearCheckedShoppingListItems();
        refreshData();
        showToast('Completed items cleared.');
      }
    );
  };

  const handleClearAllShoppingItems = () => {
    showConfirm(
      'Clear All Items',
      'Are you sure you want to completely clear your shopping list?',
      () => {
        StorageService.clearAllShoppingListItems();
        refreshData();
        showToast('Shopping list cleared.');
      }
    );
  };

  // Filter and search shopping list items
  const filteredShoppingList = useMemo(() => {
    return shoppingList.filter((item) => {
      // Hidden filter handling
      if (shoppingFilter === 'hidden') {
        if (!item.hidden) return false;
      } else {
        // Active views: strictly exclude hidden items
        if (item.hidden) return false;
        if (shoppingFilter === 'checked' && !item.checked) return false;
        if (shoppingFilter === 'unchecked' && item.checked) return false;
      }

      // Check category filter
      if (shoppingCategoryFilter !== 'all') {
        const itemCatId = item.categoryId || '';
        if (itemCatId !== shoppingCategoryFilter) return false;
      }

      // Check search keyword
      if (shoppingSearchQuery.trim()) {
        const q = shoppingSearchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        if (!matchName && !matchNotes) return false;
      }
      return true;
    });
  }, [shoppingList, shoppingFilter, shoppingCategoryFilter, shoppingSearchQuery]);

  // Calculate total budget (strictly active non-hidden items)
  const shoppingBudgetSummary = useMemo(() => {
    let totalEstimated = 0;
    let checkedEstimated = 0;

    shoppingList.filter((item) => !item.hidden).forEach((item) => {
      const price = item.estimatedPrice || 0;
      // Extract numeric prefix from quantity e.g. "5 kg" -> 5
      const qtyNum = parseFloat(item.quantity) || 1;
      const itemCost = price * qtyNum;

      totalEstimated += itemCost;
      if (item.checked) {
        checkedEstimated += itemCost;
      }
    });

    return { totalEstimated, checkedEstimated };
  }, [shoppingList]);

  // Combined sales list: Merges inventory sales with staff sales records
  const allSalesCombined = useMemo(() => {
    const staffAsInventorySales: (InventorySale & { isStaffSale?: boolean; workerName?: string })[] = staffSales.map((ss) => {
      const worker = workers.find((w) => w.id === ss.workerId);
      const workerName = worker ? worker.name : 'Staff Member';
      return {
        id: `staff_${ss.id}`,
        productName: `${ss.itemSold}`,
        quantity: 1,
        costPrice: 0,
        sellingPrice: ss.amount,
        totalPrice: ss.amount,
        profit: Math.max(0, ss.amount - (ss.commission || 0)),
        customerName: ss.customerName || `Staff: ${workerName}`,
        date: ss.date ? ss.date.substring(0, 10) : (ss.createdAt ? ss.createdAt.substring(0, 10) : ''),
        createdAt: ss.createdAt || new Date().toISOString(),
        isStaffSale: true,
        workerName: workerName,
      };
    });

    return [...sales, ...staffAsInventorySales];
  }, [sales, staffSales, workers]);

  /* -------------------------------------------------------------------------- */
  /* TAB 4: REPORT STATE                                                        */
  /* -------------------------------------------------------------------------- */
  const [reportTimeFilter, setReportTimeFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | 'all'>('all');
  const [reportCustomFilterDate, setReportCustomFilterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reportMetricView, setReportMetricView] = useState<'sales' | 'profit'>('sales');

  const periodSales = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${curYear}-${curMonth}-${curDay}`;

    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday);
    const sunday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday + 6);

    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    const thisMonthStr = `${curYear}-${curMonth}`;
    const thisYearStr = `${curYear}`;

    return allSalesCombined
      .filter((s) => {
        const sDate = s.date || (s.createdAt ? s.createdAt.split('T')[0] : '');
        if (!sDate) return reportTimeFilter === 'all';
        if (reportTimeFilter === 'today') return sDate === todayStr;
        if (reportTimeFilter === 'week') return sDate >= mondayStr && sDate <= sundayStr;
        if (reportTimeFilter === 'month') return sDate.startsWith(thisMonthStr);
        if (reportTimeFilter === 'year') return sDate.startsWith(thisYearStr);
        if (reportTimeFilter === 'custom') return sDate === reportCustomFilterDate;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allSalesCombined, reportTimeFilter, reportCustomFilterDate]);

  const periodTotalSales = useMemo(() => {
    return periodSales.reduce((acc, s) => acc + s.totalPrice, 0);
  }, [periodSales]);

  const periodTotalProfit = useMemo(() => {
    return periodSales.reduce((acc, s) => acc + s.profit, 0);
  }, [periodSales]);

  // Per-Agent Consignment & Ledger Analytics for Report Period
  const agentPeriodAnalytics = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${curYear}-${curMonth}-${curDay}`;

    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday);
    const sunday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday + 6);
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    const thisMonthStr = `${curYear}-${curMonth}`;
    const thisYearStr = `${curYear}`;

    const isDateMatch = (dStr: string) => {
      if (!dStr) return reportTimeFilter === 'all';
      if (reportTimeFilter === 'today') return dStr === todayStr;
      if (reportTimeFilter === 'week') return dStr >= mondayStr && dStr <= sundayStr;
      if (reportTimeFilter === 'month') return dStr.startsWith(thisMonthStr);
      if (reportTimeFilter === 'year') return dStr.startsWith(thisYearStr);
      if (reportTimeFilter === 'custom') return dStr === reportCustomFilterDate;
      return true;
    };

    const periodLedger = agentLedger.filter((a) => isDateMatch(a.date || (a.createdAt ? a.createdAt.split('T')[0] : '')));
    const totalConsignmentTaken = periodLedger.reduce((sum, a) => sum + (a.totalAmount || 0), 0);
    const totalCashPaid = periodLedger.reduce((sum, a) => sum + (a.cashPaid || 0), 0);
    const totalRemainingBalance = periodLedger.reduce((sum, a) => sum + (a.remainingBalance || 0), 0);

    const agentBreakdown = agents.map((agent) => {
      const aRecords = periodLedger.filter((r) => r.agentId === agent.id);
      return {
        agent,
        recordCount: aRecords.length,
        takenValue: aRecords.reduce((sum, r) => sum + (r.totalAmount || 0), 0),
        cashPaid: aRecords.reduce((sum, r) => sum + (r.cashPaid || 0), 0),
        remainingBalance: aRecords.reduce((sum, r) => sum + (r.remainingBalance || 0), 0),
      };
    });

    return {
      periodLedger,
      totalConsignmentTaken,
      totalCashPaid,
      totalRemainingBalance,
      agentBreakdown,
    };
  }, [agents, agentLedger, reportTimeFilter, reportCustomFilterDate]);

  // Per-Worker Staff Sales & Performance Analytics for Report Period
  const workerPeriodSalesAnalytics = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${curYear}-${curMonth}-${curDay}`;

    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday);
    const sunday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday + 6);
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    const thisMonthStr = `${curYear}-${curMonth}`;
    const thisYearStr = `${curYear}`;

    const isDateMatch = (dStr: string) => {
      if (!dStr) return reportTimeFilter === 'all';
      if (reportTimeFilter === 'today') return dStr === todayStr;
      if (reportTimeFilter === 'week') return dStr >= mondayStr && dStr <= sundayStr;
      if (reportTimeFilter === 'month') return dStr.startsWith(thisMonthStr);
      if (reportTimeFilter === 'year') return dStr.startsWith(thisYearStr);
      if (reportTimeFilter === 'custom') return dStr === reportCustomFilterDate;
      return true;
    };

    const periodStaffSales = staffSales.filter((s) => isDateMatch(s.date || (s.createdAt ? s.createdAt.split('T')[0] : '')));
    const totalStaffSalesVolume = periodStaffSales.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalStaffCommissions = periodStaffSales.reduce((sum, s) => sum + (s.commission || 0), 0);

    const workerBreakdown = workers.map((worker) => {
      const wSales = periodStaffSales.filter((s) => s.workerId === worker.id);
      return {
        worker,
        salesCount: wSales.length,
        totalSales: wSales.reduce((sum, s) => sum + (s.amount || 0), 0),
        totalCommission: wSales.reduce((sum, s) => sum + (s.commission || 0), 0),
      };
    });

    return {
      periodStaffSales,
      totalStaffSalesVolume,
      totalStaffCommissions,
      workerBreakdown,
    };
  }, [workers, staffSales, reportTimeFilter, reportCustomFilterDate]);

  const reportMetrics = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${curYear}-${curMonth}-${curDay}`;

    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday);
    const sunday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday + 6);
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    const thisMonthStr = `${curYear}-${curMonth}`;
    const thisYearStr = `${curYear}`;

    const isDateMatch = (dStr: string) => {
      if (!dStr) return reportTimeFilter === 'all';
      if (reportTimeFilter === 'today') return dStr === todayStr;
      if (reportTimeFilter === 'week') return dStr >= mondayStr && dStr <= sundayStr;
      if (reportTimeFilter === 'month') return dStr.startsWith(thisMonthStr);
      if (reportTimeFilter === 'year') return dStr.startsWith(thisYearStr);
      if (reportTimeFilter === 'custom') return dStr === reportCustomFilterDate;
      return true;
    };

    // Calculate Sales items
    const pSales = sales.filter(s => isDateMatch(s.date || (s.createdAt ? s.createdAt.split('T')[0] : '')));
    const itemsSold = pSales.reduce((acc, s) => acc + (s.quantity || 1), 0);

    // Calculate Expenses
    const pExpenses = expenses.filter(e => isDateMatch(e.date || (e.createdAt ? e.createdAt.split('T')[0] : '')));
    const totalExpenses = pExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // Calculate Debts
    const pDebts = debts.filter(d => isDateMatch(d.date || (d.createdAt ? d.createdAt.split('T')[0] : '')));
    const totalDebtsDemanded = pDebts.reduce((acc, d) => acc + d.amount, 0);
    const totalDebtsPaid = pDebts.reduce((acc, d) => acc + (d.paidAmount || (d.status === 'paid' ? d.amount : 0)), 0);

    // Calculate Shopping List
    const pShopping = shoppingList.filter(s => isDateMatch(s.createdAt ? s.createdAt.split('T')[0] : ''));
    const totalShoppingCost = pShopping.reduce((acc, s) => acc + ((s.estimatedCost || s.estimatedPrice || 0) * (parseFloat(s.quantity) || 1)), 0);

    return {
      itemsSold,
      totalExpenses,
      totalDebtsDemanded,
      totalDebtsPaid,
      totalShoppingCost
    };
  }, [sales, expenses, debts, shoppingList, reportTimeFilter, reportCustomFilterDate]);

  // Dynamic Chart Breakdown according to active timeframe filter
  const reportChartData = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    if (reportTimeFilter === 'today' || reportTimeFilter === 'custom') {
      const dateLabel = reportTimeFilter === 'today'
        ? 'Today'
        : new Date(reportCustomFilterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      const blocks = [
        { label: '4 AM', tooltip: '12am - 4am', hours: [0, 1, 2, 3] },
        { label: '8 AM', tooltip: '4am - 8am', hours: [4, 5, 6, 7] },
        { label: '12 PM', tooltip: '8am - 12pm', hours: [8, 9, 10, 11] },
        { label: '4 PM', tooltip: '12pm - 4pm', hours: [12, 13, 14, 15] },
        { label: '8 PM', tooltip: '4pm - 8pm', hours: [16, 17, 18, 19] },
        { label: '11 PM', tooltip: '8pm - 11:59pm', hours: [20, 21, 22, 23] },
      ];
      const items = blocks.map((b) => ({ label: b.label, tooltip: b.tooltip, sales: 0, profit: 0 }));

      for (const s of periodSales) {
        let h = 12;
        if (s.createdAt && s.createdAt.includes('T')) {
          const timePart = s.createdAt.split('T')[1];
          h = parseInt(timePart.split(':')[0], 10) || 12;
        }
        const idx = Math.min(5, Math.floor(h / 4));
        items[idx].sales += s.totalPrice;
        items[idx].profit += s.profit;
      }

      return {
        items,
        chartTitle: reportTimeFilter === 'today' ? "TODAY'S HOURLY ACTIVITY" : `ACTIVITY FOR ${dateLabel.toUpperCase()}`,
        subtitle: dateLabel,
      };
    }

    if (reportTimeFilter === 'week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday);

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const items = days.map((dayName, idx) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + idx);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const daySales = periodSales.filter((s) => (s.date || (s.createdAt ? s.createdAt.split('T')[0] : '')) === dateStr);
        return {
          label: dayName,
          tooltip: `${dayName} (${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})`,
          sales: daySales.reduce((acc, s) => acc + s.totalPrice, 0),
          profit: daySales.reduce((acc, s) => acc + s.profit, 0),
        };
      });

      return {
        items,
        chartTitle: "THIS WEEK'S BREAKDOWN",
        subtitle: `${monday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${new Date(monday.getTime() + 6 * 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      };
    }

    if (reportTimeFilter === 'year') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const items = months.map((mName, idx) => {
        const mPrefix = `${curYear}-${String(idx + 1).padStart(2, '0')}`;
        const mSales = periodSales.filter((s) => (s.date || (s.createdAt ? s.createdAt.split('T')[0] : '')).startsWith(mPrefix));
        return {
          label: mName,
          tooltip: `${mName} ${curYear}`,
          sales: mSales.reduce((acc, s) => acc + s.totalPrice, 0),
          profit: mSales.reduce((acc, s) => acc + s.profit, 0),
        };
      });

      return {
        items,
        chartTitle: `${curYear} MONTHLY BREAKDOWN`,
        subtitle: `Full Year ${curYear}`,
      };
    }

    if (reportTimeFilter === 'all') {
      const items: { label: string; tooltip: string; sales: number; profit: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const mLabel = d.toLocaleDateString('en-US', { month: 'short' });
        const mTooltip = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const mSales = periodSales.filter((s) => (s.date || (s.createdAt ? s.createdAt.split('T')[0] : '')).startsWith(mPrefix));
        items.push({
          label: mLabel,
          tooltip: mTooltip,
          sales: mSales.reduce((acc, s) => acc + s.totalPrice, 0),
          profit: mSales.reduce((acc, s) => acc + s.profit, 0),
        });
      }

      return {
        items,
        chartTitle: 'ALL-TIME MONTHLY TREND',
        subtitle: 'Past 12 Months',
      };
    }

    // Default: This Month (1..daysInMonth)
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    const items: { label: string; tooltip: string; sales: number; profit: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dSales = periodSales.filter((s) => (s.date || (s.createdAt ? s.createdAt.split('T')[0] : '')) === dayStr);
      items.push({
        label: `${d}`,
        tooltip: `Day ${d} (${new Date(curYear, curMonth, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})`,
        sales: dSales.reduce((acc, s) => acc + s.totalPrice, 0),
        profit: dSales.reduce((acc, s) => acc + s.profit, 0),
      });
    }

    const monthName = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return {
      items,
      chartTitle: 'DAILY SALES',
      subtitle: monthName,
    };
  }, [periodSales, reportTimeFilter, reportCustomFilterDate]);

  const maxChartValue = useMemo(() => {
    let max = 0;
    for (const d of reportChartData.items) {
      const val = reportMetricView === 'sales' ? d.sales : d.profit;
      if (val > max) max = val;
    }
    return max || 1;
  }, [reportChartData, reportMetricView]);

  // Filtered sales for SALES tab bottom list
  const filteredSalesList = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${curYear}-${curMonth}-${curDay}`;

    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday);
    const sunday = new Date(curYear, now.getMonth(), now.getDate() - diffToMonday + 6);

    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    const thisMonthStr = `${curYear}-${curMonth}`;
    const thisYearStr = `${curYear}`;

    return allSalesCombined
      .filter((s) => {
        const sDate = s.date || (s.createdAt ? s.createdAt.split('T')[0] : '');
        if (!sDate) return saleDateFilter === 'all';
        if (saleDateFilter === 'today') return sDate === todayStr;
        if (saleDateFilter === 'week') return sDate >= mondayStr && sDate <= sundayStr;
        if (saleDateFilter === 'month') return sDate.startsWith(thisMonthStr);
        if (saleDateFilter === 'year') return sDate.startsWith(thisYearStr);
        if (saleDateFilter === 'custom') return sDate === saleCustomFilterDate;
        return true;
      })
      .filter((s) => {
        if (!saleFilterQuery) return true;
        return (
          s.productName.toLowerCase().includes(saleFilterQuery.toLowerCase()) ||
          (s.customerName && s.customerName.toLowerCase().includes(saleFilterQuery.toLowerCase()))
        );
      })
      .sort((a, b) => {
        if (saleSortOrder === 'amount') return b.totalPrice - a.totalPrice;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [allSalesCombined, saleDateFilter, saleCustomFilterDate, saleFilterQuery, saleSortOrder]);

  const totalSalesAmountForPeriod = useMemo(() => {
    return filteredSalesList.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
  }, [filteredSalesList]);

  const totalItemsSoldForPeriod = useMemo(() => {
    return filteredSalesList.reduce((sum, s) => sum + (s.quantity || 1), 0);
  }, [filteredSalesList]);

  const getReportPeriodTitle = () => {
    if (reportTimeFilter === 'today') return "Today's Report";
    if (reportTimeFilter === 'week') return "This Week's Report";
    if (reportTimeFilter === 'month') return "This Month's Report";
    if (reportTimeFilter === 'year') return "This Year's Report";
    if (reportTimeFilter === 'custom') {
      return `Report for ${new Date(reportCustomFilterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    return 'All Time Report';
  };

  const getSalePeriodTitle = () => {
    if (saleDateFilter === 'today') return "Today's Sales";
    if (saleDateFilter === 'week') return "This Week's Sales";
    if (saleDateFilter === 'month') return "This Month's Sales";
    if (saleDateFilter === 'year') return "This Year's Sales";
    if (saleDateFilter === 'custom') {
      return `Sales for ${new Date(saleCustomFilterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    return 'All Time Sales';
  };

  const getExpensePeriodTitle = () => {
    if (expenseFilter === 'today') return "Today's Expenses";
    if (expenseFilter === 'week') return "This Week's Expenses";
    if (expenseFilter === 'month') return "This Month's Expenses";
    if (expenseFilter === 'year') return "This Year's Expenses";
    return 'All Time Expenses';
  };

  const getDebtPeriodTitle = () => {
    if (debtTimeFilter === 'today') return "Today's Debts";
    if (debtTimeFilter === 'week') return "This Week's Debts";
    if (debtTimeFilter === 'month') return "This Month's Debts";
    if (debtTimeFilter === 'year') return "This Year's Debts";
    if (debtTimeFilter === 'custom') {
      return `Debts for ${new Date(debtCustomFilterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    return 'All Time Debts';
  };

  const handleSaveShoppingListPhoto = async () => {
    try {
      showToast('Generating shopping list photo...');
      await ensureStoragePermission();

      const activeItems = shoppingList.filter((item) => !item.hidden);
      const totalEstimated = shoppingBudgetSummary.totalEstimated;
      const checkedEstimated = shoppingBudgetSummary.checkedEstimated;
      const toBuyCount = activeItems.filter((item) => !item.checked).length;

      // High DPI Canvas setup
      const canvas = document.createElement('canvas');
      const width = 800;
      let estimatedHeight = 350;
      if (activeItems.length === 0) {
        estimatedHeight += 100;
      } else {
        estimatedHeight += 35; // table headers row
        activeItems.forEach((item) => {
          estimatedHeight += item.notes ? 65 : 52;
        });
      }
      estimatedHeight += 60; // footer

      canvas.width = width;
      canvas.height = estimatedHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        showToast('Could not initialize canvas');
        return;
      }

      // 1. Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, estimatedHeight);

      // Top gradient bar
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(1, '#0ea5e9');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, 8);

      let curY = 40;

      // 2. Title
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('SHOPPING LIST REPORT', width / 2, curY);

      curY += 26;
      if (business?.name) {
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
        ctx.fillText(business.name, width / 2, curY);
        curY += 22;
      }

      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      const dateStr = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      ctx.fillText(`Generated: ${dateStr}`, width / 2, curY);

      curY += 25;

      // 3. Summary Cards Box
      const boxX = 36;
      const boxWidth = width - boxX * 2;
      const boxHeight = 74;

      const drawRoundRect = (x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      };

      drawRoundRect(boxX, curY, boxWidth, boxHeight, 14, '#f8fafc', '#e2e8f0');

      const colWidth = boxWidth / 3;

      // Col 1: Total Budget
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.fillText('TOTAL BUDGET', boxX + colWidth * 0.5, curY + 28);
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${currency} ${totalEstimated.toLocaleString()}`, boxX + colWidth * 0.5, curY + 52);

      // Divider 1
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(boxX + colWidth, curY + 16);
      ctx.lineTo(boxX + colWidth, curY + boxHeight - 16);
      ctx.stroke();

      // Col 2: Completed / Bought
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.fillText('COMPLETED', boxX + colWidth * 1.5, curY + 28);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${currency} ${checkedEstimated.toLocaleString()}`, boxX + colWidth * 1.5, curY + 52);

      // Divider 2
      ctx.beginPath();
      ctx.moveTo(boxX + colWidth * 2, curY + 16);
      ctx.lineTo(boxX + colWidth * 2, curY + boxHeight - 16);
      ctx.stroke();

      // Col 3: To Buy
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.fillText('TO BUY', boxX + colWidth * 2.5, curY + 28);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${toBuyCount} items`, boxX + colWidth * 2.5, curY + 52);

      curY += boxHeight + 30;

      // 4. Section Header: ITEMS CHECKLIST
      ctx.textAlign = 'left';
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`ITEMS CHECKLIST (${activeItems.length})`, boxX, curY);

      curY += 12;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(boxX, curY);
      ctx.lineTo(boxX + boxWidth, curY);
      ctx.stroke();

      curY += 18;

      if (activeItems.length === 0) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'italic 13px system-ui, -apple-system, sans-serif';
        ctx.fillText('No shopping list items recorded.', width / 2, curY + 30);
        curY += 60;
      } else {
        // Table Header Row: ITEM NAME | QTY | EST. PRICE | TOTAL BUDGET | STATUS
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'left';
        ctx.fillText('ITEM NAME', boxX + 26, curY);
        ctx.textAlign = 'center';
        ctx.fillText('QTY', boxX + 310, curY);
        ctx.textAlign = 'right';
        ctx.fillText('EST. PRICE', boxX + 440, curY);
        ctx.fillText('TOTAL BUDGET', boxX + 580, curY);
        ctx.textAlign = 'center';
        ctx.fillText('STATUS', boxX + 695, curY);

        curY += 6;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(boxX, curY);
        ctx.lineTo(boxX + boxWidth, curY);
        ctx.stroke();

        curY += 18;

        activeItems.forEach((item) => {
          const cat = shoppingCategories.find((c) => c.id === item.categoryId)?.name || '';
          const qtyNum = parseFloat(item.quantity) || 1;
          const unitPrice = item.estimatedPrice || 0;
          const totalCost = unitPrice * qtyNum;
          const priceStr = item.estimatedPrice ? `${currency} ${item.estimatedPrice.toLocaleString()}` : '-';
          const totalStr = totalCost > 0 ? `${currency} ${totalCost.toLocaleString()}` : '-';
          const qtyDisplay = item.quantity && item.quantity.trim() !== '' ? item.quantity : '1';
          const isDone = Boolean(item.checked);

          // Checkbox circle
          ctx.beginPath();
          ctx.arc(boxX + 10, curY + 2, 7, 0, Math.PI * 2);
          if (isDone) {
            ctx.fillStyle = '#10b981';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(boxX + 7, curY + 2);
            ctx.lineTo(boxX + 9.5, curY + 5);
            ctx.lineTo(boxX + 13.5, curY - 1);
            ctx.stroke();
          } else {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Item Name
          ctx.textAlign = 'left';
          ctx.fillStyle = isDone ? '#64748b' : '#0f172a';
          ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
          ctx.fillText(item.name, boxX + 26, curY + 6);

          // Details: Category, Note
          let detailParts: string[] = [];
          if (cat) detailParts.push(`Category: ${cat}`);
          if (item.notes) detailParts.push(`Note: ${item.notes}`);

          if (detailParts.length > 0) {
            ctx.fillStyle = '#64748b';
            ctx.font = '11px system-ui, -apple-system, sans-serif';
            ctx.fillText(detailParts.join('  •  '), boxX + 26, curY + 22);
          }

          // QTY (Centered)
          ctx.textAlign = 'center';
          ctx.fillStyle = '#334155';
          ctx.font = '12px system-ui, -apple-system, sans-serif';
          ctx.fillText(qtyDisplay, boxX + 310, curY + 6);

          // EST. PRICE (Unit Price, right-aligned)
          ctx.textAlign = 'right';
          ctx.fillStyle = '#475569';
          ctx.font = '12px system-ui, -apple-system, sans-serif';
          ctx.fillText(priceStr, boxX + 440, curY + 6);

          // TOTAL BUDGET (Line Total, right-aligned, bold)
          ctx.textAlign = 'right';
          ctx.fillStyle = isDone ? '#10b981' : '#0284c7';
          ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
          ctx.fillText(totalStr, boxX + 580, curY + 6);

          // Status Badge Pill
          const statusText = isDone ? 'BOUGHT' : 'TO BUY';
          const statusColor = isDone ? '#10b981' : '#f59e0b';
          const statusBg = isDone ? '#ecfdf5' : '#fffbeb';
          const badgeWidth = 62;
          drawRoundRect(boxX + 664, curY - 6, badgeWidth, 20, 6, statusBg, statusColor);
          ctx.textAlign = 'center';
          ctx.fillStyle = statusColor;
          ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
          ctx.fillText(statusText, boxX + 664 + badgeWidth / 2, curY + 7);

          // Line separator
          curY += (item.notes || cat) ? 46 : 38;
          ctx.strokeStyle = '#f1f5f9';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(boxX, curY);
          ctx.lineTo(boxX + boxWidth, curY);
          ctx.stroke();
          curY += 14;
        });
      }

      // 5. Footer
      curY += 10;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('Powered by Brivu Business Manager', width / 2, curY);

      // Save image
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `Shopping_List_${timestamp}.png`;
      const res = await saveFile({
        data: dataUrl,
        filename,
        mimeType: 'image/png',
        title: 'Shopping List Photo',
        destination: 'photos',
        folder: 'reports',
      });

      if (res.success) {
        showToast('Shopping list photo saved to Gallery / Pictures!');
        AdMobService.showInterstitial('shopping_list_photo_saved');
      } else {
        showToast(res.message || 'Failed to save photo');
      }
    } catch (err) {
      console.warn('Error saving shopping list photo:', err);
      showToast('Could not save shopping list photo');
    }
  };

  // Section-specific PDF export: Each section exports strictly its own report
  const handleExportReport = async (targetSection?: 'stock' | 'sales' | 'expense' | 'debts' | 'shoppingList' | 'report' | 'customers' | 'agents' | 'workers') => {
    try {
      const section = targetSection || activeTab;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;

      // -------------------------------------------------------------
      // 0B. STAFF DIRECTORY REPORT
      // -------------------------------------------------------------
      if (section === 'workers') {
        const reportTitle = 'BUSINESS STAFF DIRECTORY';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(reportTitle, pageWidth / 2, y, { align: 'center' });
        y += 7;

        if (business?.name) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(business.name, pageWidth / 2, y, { align: 'center' });
          y += 5;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, y, { align: 'center' });
        y += 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Staff & Payroll Summary', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Total Staff Members: ${filteredWorkers.length}`, margin, y);
        doc.text(`Est. Monthly Payroll: ${currency} ${totalMonthlyPayroll.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, margin + 60, y);
        y += 8;

        // Table headers
        doc.setFillColor(14, 165, 233);
        doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);

        const colIdx = margin + 2;
        const colName = margin + 7;
        const colNin = margin + 44;
        const colPhone = margin + 72;
        const colAddress = margin + 102;
        const colSchedule = margin + 134;
        const colSalary = margin + 166;

        doc.text('#', colIdx, y + 5);
        doc.text('NAME & ROLE', colName, y + 5);
        doc.text('NIN / NAT. ID', colNin, y + 5);
        doc.text('PHONE', colPhone, y + 5);
        doc.text('ADDRESS', colAddress, y + 5);
        doc.text('SCHEDULE', colSchedule, y + 5);
        doc.text('SALARY', colSalary, y + 5);
        y += 8;

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        if (filteredWorkers.length === 0) {
          doc.text('No staff registered yet.', margin + 4, y + 5);
          y += 8;
        } else {
          filteredWorkers.forEach((w, index) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
            if (index % 2 === 1) {
              doc.setFillColor(248, 250, 252);
              doc.rect(margin, y - 2, pageWidth - 2 * margin, 7, 'F');
            }
            doc.text(`${index + 1}`, colIdx, y + 3);
            const nameAndRole = w.role ? `${w.name} (${w.role})` : w.name;
            doc.text(nameAndRole.substring(0, 20), colName, y + 3);
            doc.text((w.nin || 'N/A').substring(0, 15), colNin, y + 3);
            doc.text(w.phone.substring(0, 14), colPhone, y + 3);
            doc.text((w.homeAddress || 'N/A').substring(0, 16), colAddress, y + 3);
            const schedule = [w.workDays, w.workHours].filter(Boolean).join(', ') || 'N/A';
            doc.text(schedule.substring(0, 16), colSchedule, y + 3);
            const periodLabel = w.salaryPeriod === 'daily' ? '/day' : w.salaryPeriod === 'weekly' ? '/wk' : '/mo';
            doc.text(`${w.salary.toLocaleString()}${periodLabel}`, colSalary, y + 3);
            y += 6;
          });
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const pdfFilename = `Staff_Directory_${dateStr}.pdf`;
        const res = await saveJsPdf(doc, pdfFilename, 'Staff Directory', { folder: 'reports' });
        if (res.success) {
          showToast(res.message);
        } else {
          showToast('Failed to export PDF');
        }
        return;
      }

      // -------------------------------------------------------------
      // 0A. AGENTS DIRECTORY REPORT
      // -------------------------------------------------------------
      if (section === 'agents') {
        const reportTitle = 'BUSINESS AGENTS DIRECTORY & CONTACTS LIST';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(reportTitle, pageWidth / 2, y, { align: 'center' });
        y += 7;

        if (business?.name) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(business.name, pageWidth / 2, y, { align: 'center' });
          y += 5;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, y, { align: 'center' });
        y += 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Agents Summary', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Total Business Agents: ${filteredAgents.length}`, margin, y);
        y += 8;

        // Table headers
        doc.setFillColor(14, 165, 233);
        doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);

        const colIdx = margin + 3;
        const colName = margin + 12;
        const colShop = margin + 60;
        const colContact = margin + 105;
        const colAddr = margin + 145;

        doc.text('#', colIdx, y + 5);
        doc.text('AGENT NAME', colName, y + 5);
        doc.text('SHOP NAME', colShop, y + 5);
        doc.text('CONTACT / PHONE', colContact, y + 5);
        doc.text('ADDRESS / LOCATION', colAddr, y + 5);
        y += 8;

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        if (filteredAgents.length === 0) {
          doc.text('No agents registered yet.', margin + 4, y + 5);
          y += 8;
        } else {
          filteredAgents.forEach((a, index) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
            if (index % 2 === 1) {
              doc.setFillColor(248, 250, 252);
              doc.rect(margin, y - 2, pageWidth - 2 * margin, 7, 'F');
            }
            doc.text(`${index + 1}`, colIdx, y + 3);
            doc.text(a.agentName.substring(0, 24), colName, y + 3);
            doc.text((a.shopName || 'N/A').substring(0, 22), colShop, y + 3);
            doc.text(a.contact.substring(0, 20), colContact, y + 3);
            doc.text((a.address || 'N/A').substring(0, 20), colAddr, y + 3);
            y += 6;
          });
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const pdfFilename = `Agents_Directory_${dateStr}.pdf`;
        const res = await saveJsPdf(doc, pdfFilename, 'Agents Directory', { folder: 'reports' });
        if (res.success) {
          showToast(res.message);
        } else {
          showToast('Failed to export PDF');
        }
        return;
      }

      // -------------------------------------------------------------
      // 0. CLIENT DIRECTORY REPORT (ONLY CLIENTS)
      // -------------------------------------------------------------
      if (section === 'customers') {
        const reportTitle = 'CLIENT DIRECTORY & CONTACTS LIST';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(reportTitle, pageWidth / 2, y, { align: 'center' });
        y += 7;

        if (business?.name) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(business.name, pageWidth / 2, y, { align: 'center' });
          y += 5;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, y, { align: 'center' });
        y += 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Client Summary', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Total Clients on Record: ${filteredCustomers.length}`, margin, y);
        y += 8;

        // Table headers
        doc.setFillColor(2, 132, 199);
        doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);

        const colIdx = margin + 3;
        const colName = margin + 12;
        const colContact = margin + 65;
        const colLoc = margin + 110;
        const colDate = margin + 155;

        doc.text('#', colIdx, y + 5);
        doc.text('CLIENT NAME', colName, y + 5);
        doc.text('CONTACT / PHONE', colContact, y + 5);
        doc.text('LOCATION / ADDRESS', colLoc, y + 5);
        doc.text('DATE ADDED', colDate, y + 5);
        y += 8;

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        if (filteredCustomers.length === 0) {
          doc.text('No clients registered yet.', margin + 4, y + 5);
          y += 8;
        } else {
          filteredCustomers.forEach((c, index) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
            if (index % 2 === 1) {
              doc.setFillColor(248, 250, 252);
              doc.rect(margin, y - 2, pageWidth - 2 * margin, 7, 'F');
            }
            doc.text(`${index + 1}`, colIdx, y + 3);
            doc.text(c.name.substring(0, 30), colName, y + 3);
            doc.text(c.contact.substring(0, 25), colContact, y + 3);
            doc.text((c.location || 'N/A').substring(0, 25), colLoc, y + 3);
            doc.text(new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), colDate, y + 3);
            y += 6;
          });
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const pdfFilename = `Client_Directory_${dateStr}.pdf`;
        const res = await saveJsPdf(doc, pdfFilename, 'Client Directory', { folder: 'reports' });
        if (res.success) {
          showToast(res.message);
        } else {
          showToast('Failed to export PDF');
        }
        return;
      }

      // -------------------------------------------------------------
      // 1. SHOPPING LIST REPORT (ONLY SHOPPING LIST ITEMS)
      // -------------------------------------------------------------
      if (section === 'shoppingList') {
        const activeShoppingList = shoppingList.filter((item) => !item.hidden);
        const toBuyCount = activeShoppingList.filter((item) => !item.checked).length;
        const totalEstimated = shoppingBudgetSummary.totalEstimated;
        const checkedEstimated = shoppingBudgetSummary.checkedEstimated;
        const dateStr = new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const boxX = margin;
        const boxWidth = pageWidth - margin * 2;

        const drawPageHeader = (isFirstPage: boolean) => {
          // Top accent bar
          doc.setFillColor(2, 132, 199);
          doc.rect(0, 0, pageWidth, 3.5, 'F');

          if (isFirstPage) {
            y = 15;
            // Title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(2, 132, 199);
            doc.text('SHOPPING LIST REPORT', pageWidth / 2, y, { align: 'center' });
            y += 6;

            // Business name
            if (business?.name) {
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(12);
              doc.setTextColor(30, 41, 59);
              doc.text(business.name, pageWidth / 2, y, { align: 'center' });
              y += 5.5;
            }

            // Generated date
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Generated: ${dateStr}`, pageWidth / 2, y, { align: 'center' });
            y += 6.5;

            // 3-Column Summary Cards Box
            const boxHeight = 17;
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.35);
            doc.roundedRect(boxX, y, boxWidth, boxHeight, 3, 3, 'FD');

            const colW = boxWidth / 3;

            // Col 1: Total Budget
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text('TOTAL BUDGET', boxX + colW * 0.5, y + 6, { align: 'center' });
            doc.setFontSize(10.5);
            doc.setTextColor(2, 132, 199);
            doc.text(`${currency} ${totalEstimated.toLocaleString()}`, boxX + colW * 0.5, y + 12.5, { align: 'center' });

            // Divider 1
            doc.setDrawColor(226, 232, 240);
            doc.line(boxX + colW, y + 3, boxX + colW, y + boxHeight - 3);

            // Col 2: Completed
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text('COMPLETED', boxX + colW * 1.5, y + 6, { align: 'center' });
            doc.setFontSize(10.5);
            doc.setTextColor(16, 185, 129);
            doc.text(`${currency} ${checkedEstimated.toLocaleString()}`, boxX + colW * 1.5, y + 12.5, { align: 'center' });

            // Divider 2
            doc.line(boxX + colW * 2, y + 3, boxX + colW * 2, y + boxHeight - 3);

            // Col 3: To Buy
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text('TO BUY', boxX + colW * 2.5, y + 6, { align: 'center' });
            doc.setFontSize(10.5);
            doc.setTextColor(245, 158, 11);
            doc.text(`${toBuyCount} items`, boxX + colW * 2.5, y + 12.5, { align: 'center' });

            y += boxHeight + 8;

            // Section Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(51, 65, 85);
            doc.text(`ITEMS CHECKLIST (${activeShoppingList.length})`, boxX, y);
            y += 2.5;
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.4);
            doc.line(boxX, y, boxX + boxWidth, y);
            y += 5;
          } else {
            y = 14;
          }

          // Table Headers Row: ITEM NAME | QTY | EST. PRICE | TOTAL BUDGET | STATUS
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text('ITEM NAME', boxX + 6, y);
          doc.text('QTY', boxX + 78, y, { align: 'center' });
          doc.text('EST. PRICE', boxX + 114, y, { align: 'right' });
          doc.text('TOTAL BUDGET', boxX + 152, y, { align: 'right' });
          doc.text('STATUS', boxX + 172, y, { align: 'center' });

          y += 2;
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.25);
          doc.line(boxX, y, boxX + boxWidth, y);
          y += 4.5;
        };

        drawPageHeader(true);

        if (activeShoppingList.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9);
          doc.setTextColor(148, 163, 184);
          doc.text('No shopping list items recorded.', pageWidth / 2, y + 8, { align: 'center' });
          y += 20;
        } else {
          activeShoppingList.forEach((item) => {
            if (y > 265) {
              doc.addPage();
              drawPageHeader(false);
            }

            const cat = shoppingCategories.find((c) => c.id === item.categoryId)?.name || '';
            const qtyNum = parseFloat(item.quantity) || 1;
            const unitPrice = item.estimatedPrice || 0;
            const totalCost = unitPrice * qtyNum;
            const priceStr = item.estimatedPrice ? `${currency} ${item.estimatedPrice.toLocaleString()}` : '-';
            const totalStr = totalCost > 0 ? `${currency} ${totalCost.toLocaleString()}` : '-';
            const qtyDisplay = item.quantity && item.quantity.trim() !== '' ? item.quantity : '1';
            const isDone = Boolean(item.checked);

            // Checkbox Circle
            const circleX = boxX + 2.5;
            const circleY = y - 1;
            if (isDone) {
              doc.setFillColor(16, 185, 129);
              doc.circle(circleX, circleY, 1.6, 'F');
              doc.setDrawColor(255, 255, 255);
              doc.setLineWidth(0.4);
              doc.line(circleX - 0.7, circleY, circleX - 0.1, circleY + 0.7);
              doc.line(circleX - 0.1, circleY + 0.7, circleX + 0.8, circleY - 0.6);
            } else {
              doc.setDrawColor(203, 213, 225);
              doc.setLineWidth(0.3);
              doc.circle(circleX, circleY, 1.6, 'S');
            }

            // Item Name (Max width 68mm)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            if (isDone) {
              doc.setTextColor(100, 116, 139);
            } else {
              doc.setTextColor(15, 23, 42);
            }
            const nameLine = doc.splitTextToSize(item.name, 68)[0];
            doc.text(nameLine, boxX + 6, y);

            // Subtitle: Category & Note
            let detailParts: string[] = [];
            if (cat && cat !== 'General') detailParts.push(`Category: ${cat}`);
            if (item.notes && item.notes.trim() !== '') detailParts.push(`Note: ${item.notes.trim()}`);
            const hasDetails = detailParts.length > 0;
            if (hasDetails) {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(7.2);
              doc.setTextColor(100, 116, 139);
              const detailLine = doc.splitTextToSize(detailParts.join('  •  '), 68)[0];
              doc.text(detailLine, boxX + 6, y + 3.8);
            }

            // QTY (Centered)
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(51, 65, 85);
            doc.text(qtyDisplay, boxX + 78, y, { align: 'center' });

            // EST. PRICE (Unit Price, right-aligned)
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);
            doc.text(priceStr, boxX + 114, y, { align: 'right' });

            // TOTAL BUDGET (Line Total, bold, right-aligned)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            if (isDone) {
              doc.setTextColor(16, 185, 129);
            } else {
              doc.setTextColor(2, 132, 199);
            }
            doc.text(totalStr, boxX + 152, y, { align: 'right' });

            // STATUS (Rounded Pill Badge)
            const badgeW = 19;
            const badgeH = 4.8;
            const badgeX = boxX + 162.5;
            const badgeY = y - 3.4;
            if (isDone) {
              doc.setFillColor(236, 253, 245);
              doc.setDrawColor(16, 185, 129);
              doc.setLineWidth(0.25);
              doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.4, 1.4, 'FD');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.8);
              doc.setTextColor(16, 185, 129);
              doc.text('BOUGHT', badgeX + badgeW / 2, y - 0.2, { align: 'center' });
            } else {
              doc.setFillColor(255, 251, 235);
              doc.setDrawColor(245, 158, 11);
              doc.setLineWidth(0.25);
              doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.4, 1.4, 'FD');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.8);
              doc.setTextColor(245, 158, 11);
              doc.text('TO BUY', badgeX + badgeW / 2, y - 0.2, { align: 'center' });
            }

            // Row divider line
            const rowBottom = y + (hasDetails ? 6.5 : 4.5);
            doc.setDrawColor(241, 245, 249);
            doc.setLineWidth(0.2);
            doc.line(boxX, rowBottom, boxX + boxWidth, rowBottom);
            y = rowBottom + 4.5;
          });
        }

        // Footer on bottom of current page
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Powered by Brivu Business Manager', pageWidth / 2, 287, { align: 'center' });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const pdfFilename = `Shopping_List_${timestamp}.pdf`;
        const res = await saveJsPdf(doc, pdfFilename, 'Shopping List', { folder: 'reports' });
        if (res.success) {
          showToast(res.message);
        } else {
          showToast('Failed to export PDF');
        }
        return;
      }

      // -------------------------------------------------------------
      // 2. SALES REPORT (ONLY SALES RECORDS)
      // -------------------------------------------------------------
      if (section === 'sales') {
        const reportTitle = 'SALES REPORT';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(reportTitle, pageWidth / 2, y, { align: 'center' });
        y += 7;

        if (business?.name) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(business.name, pageWidth / 2, y, { align: 'center' });
          y += 5;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Period: ${getSalePeriodTitle()} • Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, y, { align: 'center' });
        y += 10;

        // Sales Summary
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Sales Summary', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const totalSalesAmount = filteredSalesList.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
        const totalProfitAmount = filteredSalesList.reduce((sum, s) => sum + (s.profit || 0), 0);
        const totalItemsCount = filteredSalesList.reduce((sum, s) => sum + (s.quantity || 1), 0);

        doc.text(`Total Sales Revenue: ${currency} ${totalSalesAmount.toLocaleString()}`, margin, y);
        y += 5;
        doc.text(`Total Estimated Profit: ${currency} ${totalProfitAmount.toLocaleString()}`, margin, y);
        y += 5;
        doc.text(`Total Items Sold: ${totalItemsCount} units  |  Transactions: ${filteredSalesList.length}`, margin, y);
        y += 10;

        // Sales Table Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Sales Records', margin, y);
        y += 6;
        doc.setFont('courier', 'bold');
        doc.setFontSize(8);

        doc.text('DATE', margin, y);
        doc.text('PRODUCT', margin + 25, y);
        doc.text('QTY', margin + 85, y);
        doc.text('TOTAL', margin + 102, y);
        doc.text('PROFIT', margin + 130, y);
        doc.text('CLIENT', margin + 155, y);

        y += 2;
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;

        doc.setFont('courier', 'normal');

        if (filteredSalesList.length === 0) {
          doc.text('No sales recorded for this period.', margin, y);
          y += 6;
        } else {
          filteredSalesList.forEach((s) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
              doc.setFont('courier', 'bold');
              doc.text('DATE', margin, y);
              doc.text('PRODUCT', margin + 25, y);
              doc.text('QTY', margin + 85, y);
              doc.text('TOTAL', margin + 102, y);
              doc.text('PROFIT', margin + 130, y);
              doc.text('CLIENT', margin + 155, y);
              y += 2;
              doc.line(margin, y, pageWidth - margin, y);
              y += 4;
              doc.setFont('courier', 'normal');
            }
            const dateStr = (s.date || s.createdAt || '').substring(0, 10);
            const prodName = s.productName.length > 25 ? s.productName.substring(0, 23) + '..' : s.productName;
            const client = (s.customerName || '-').length > 18 ? (s.customerName || '-').substring(0, 16) + '..' : (s.customerName || '-');

            doc.text(dateStr, margin, y);
            doc.text(prodName, margin + 25, y);
            doc.text(String(s.quantity), margin + 85, y);
            doc.text(`${s.totalPrice.toLocaleString()}`, margin + 102, y);
            doc.text(`${s.profit.toLocaleString()}`, margin + 130, y);
            doc.text(client, margin + 155, y);
            y += 4;
          });
        }

        const pdfFilename = `Sales_Report_${saleDateFilter}_${new Date().toISOString().split('T')[0]}.pdf`;
        const res = await saveJsPdf(doc, pdfFilename, 'Sales Report', { folder: 'reports' });
        if (res.success) {
          showToast(res.message);
        } else {
          showToast('Failed to export PDF');
        }
        return;
      }

      // -------------------------------------------------------------
      // 3. STOCK REPORT (ONLY STOCK INVENTORY)
      // -------------------------------------------------------------
      if (section === 'stock') {
        const reportTitle = 'STOCK INVENTORY REPORT';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(reportTitle, pageWidth / 2, y, { align: 'center' });
        y += 7;

        if (business?.name) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(business.name, pageWidth / 2, y, { align: 'center' });
          y += 5;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Current Stock Status as of ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth / 2, y, { align: 'center' });
        y += 10;

        // Stock Summary
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Stock Valuation Summary', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Total Product Types (SKUs): ${products.length}  |  Total Units in Stock: ${stockAnalytics.totalItems}`, margin, y);
        y += 5;
        doc.text(`Total Cost Value: ${currency} ${stockAnalytics.totalCostValue.toLocaleString()}`, margin, y);
        y += 5;
        doc.text(`Total Retail Valuation: ${currency} ${stockAnalytics.totalRetailValue.toLocaleString()}`, margin, y);
        y += 5;
        const potentialProfit = stockAnalytics.potentialProfit;
        doc.text(`Potential Gross Profit: ${currency} ${potentialProfit.toLocaleString()}`, margin, y);
        y += 5;
        const inStockCount = products.filter((p) => p.quantity > 0).length;
        doc.text(`Stock Status: ${inStockCount} In-Stock, ${stats.lowStockCount} Low-Stock (<5), ${stats.outOfStockCount} Out-of-Stock`, margin, y);
        y += 10;

        // Stock Table Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Products Inventory List', margin, y);
        y += 6;
        doc.setFont('courier', 'bold');
        doc.setFontSize(8);

        doc.text('ID', margin, y);
        doc.text('PRODUCT', margin + 15, y);
        doc.text('CATEGORY', margin + 68, y);
        doc.text('QTY', margin + 104, y);
        doc.text('COST', margin + 120, y);
        doc.text('SELL', margin + 143, y);
        doc.text('VALUE', margin + 165, y);

        y += 2;
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;

        doc.setFont('courier', 'normal');

        if (products.length === 0) {
          doc.text('No products in stock.', margin, y);
          y += 6;
        } else {
          products.forEach((p) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
              doc.setFont('courier', 'bold');
              doc.text('ID', margin, y);
              doc.text('PRODUCT', margin + 15, y);
              doc.text('CATEGORY', margin + 68, y);
              doc.text('QTY', margin + 104, y);
              doc.text('COST', margin + 120, y);
              doc.text('SELL', margin + 143, y);
              doc.text('VALUE', margin + 165, y);
              y += 2;
              doc.line(margin, y, pageWidth - margin, y);
              y += 4;
              doc.setFont('courier', 'normal');
            }
            const idStr = p.itemId ? `#${p.itemId}` : '-';
            const prodName = p.name.length > 25 ? p.name.substring(0, 23) + '..' : p.name;
            const cat = productCategories.find((c) => c.id === p.categoryId)?.name || 'General';
            const catName = cat.length > 18 ? cat.substring(0, 16) + '..' : cat;

            doc.text(idStr, margin, y);
            doc.text(prodName, margin + 15, y);
            doc.text(catName, margin + 68, y);
            doc.text(String(p.quantity), margin + 104, y);
            doc.text(`${p.costPrice.toLocaleString()}`, margin + 120, y);
            doc.text(`${p.sellingPrice.toLocaleString()}`, margin + 143, y);
            doc.text(`${(p.quantity * p.sellingPrice).toLocaleString()}`, margin + 165, y);
            y += 4;
          });
        }

        const pdfFilename = `Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        const res = await saveJsPdf(doc, pdfFilename, 'Stock Report', { folder: 'reports' });
        if (res.success) {
          showToast(res.message);
        } else {
          showToast('Failed to export PDF');
        }
        return;
      }

      // -------------------------------------------------------------
      // 4. EXPENSES REPORT (ONLY EXPENSES)
      // -------------------------------------------------------------
      if (section === 'expense') {
        const reportTitle = 'EXPENSES REPORT';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(reportTitle, pageWidth / 2, y, { align: 'center' });
        y += 7;

        if (business?.name) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(business.name, pageWidth / 2, y, { align: 'center' });
          y += 5;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Period: ${getExpensePeriodTitle()} • Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, y, { align: 'center' });
        y += 10;

        // Expenses Summary
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Expenses Summary', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Total Expenses: ${currency} ${filteredExpensesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin, y);
        y += 5;
        doc.text(`Total Recorded Entries: ${filteredExpenses.length}`, margin, y);
        y += 10;

        // Expenses Table Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Expense Entries', margin, y);
        y += 6;
        doc.setFont('courier', 'bold');
        doc.setFontSize(8);

        doc.text('DATE', margin, y);
        doc.text('TITLE', margin + 25, y);
        doc.text('CATEGORY', margin + 85, y);
        doc.text('NOTES', margin + 120, y);
        doc.text('AMOUNT', margin + 155, y);

        y += 2;
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;

        doc.setFont('courier', 'normal');

        if (filteredExpenses.length === 0) {
          doc.text('No expenses recorded for this period.', margin, y);
          y += 6;
        } else {
          filteredExpenses.forEach((e) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
              doc.setFont('courier', 'bold');
              doc.text('DATE', margin, y);
              doc.text('TITLE', margin + 25, y);
              doc.text('CATEGORY', margin + 85, y);
              doc.text('NOTES', margin + 120, y);
              doc.text('AMOUNT', margin + 155, y);
              y += 2;
              doc.line(margin, y, pageWidth - margin, y);
              y += 4;
              doc.setFont('courier', 'normal');
            }
            const dateStr = (e.date || e.createdAt || '').substring(0, 10);
            const title = e.title.length > 28 ? e.title.substring(0, 26) + '..' : e.title;
            const cat = (e.category || '-').length > 18 ? (e.category || '-').substring(0, 16) + '..' : (e.category || '-');
            const notes = (e.notes || '-').length > 18 ? (e.notes || '-').substring(0, 16) + '..' : (e.notes || '-');

            doc.text(dateStr, margin, y);
            doc.text(title, margin + 25, y);
            doc.text(cat, margin + 85, y);
            doc.text(notes, margin + 120, y);
            doc.text(`${currency} ${e.amount.toLocaleString()}`, margin + 155, y);
            y += 4;
          });

          y += 4;
          doc.setFont('courier', 'bold');
          doc.text(`TOTAL: ${currency} ${filteredExpensesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + 120, y);
        }

        const pdfFilename = `Expenses_Report_${expenseFilter}_${new Date().toISOString().split('T')[0]}.pdf`;
        const res = await saveJsPdf(doc, pdfFilename, 'Expenses Report', { folder: 'reports' });
        if (res.success) {
          showToast(res.message);
        } else {
          showToast('Failed to export PDF');
        }
        return;
      }

      // -------------------------------------------------------------
      // 5. DEBTS REPORT (ONLY DEBTS & CUSTOMER CREDIT)
      // -------------------------------------------------------------
      if (section === 'debts') {
        const reportTitle = 'DEBTS & CREDIT REPORT';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(reportTitle, pageWidth / 2, y, { align: 'center' });
        y += 7;

        if (business?.name) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(business.name, pageWidth / 2, y, { align: 'center' });
          y += 5;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Period: ${getDebtPeriodTitle()} • Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, y, { align: 'center' });
        y += 10;

        // Debts Summary
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Debts Summary', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Total Outstanding / Demanded: ${currency} ${totalOutstandingDebts.toLocaleString()}`, margin, y);
        y += 5;
        doc.text(`Total Recovered / Paid: ${currency} ${totalRecoveredDebts.toLocaleString()}`, margin, y);
        y += 5;
        doc.text(`Total Records: ${timeFilteredDebts.length} (${unpaidDebtsCount} currently unpaid or partial)`, margin, y);
        y += 10;

        // Debts Table Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Debts & Demands List', margin, y);
        y += 6;
        doc.setFont('courier', 'bold');
        doc.setFontSize(8);

        doc.text('DATE', margin, y);
        doc.text('CUSTOMER', margin + 22, y);
        doc.text('PHONE', margin + 62, y);
        doc.text('ITEM/INFO', margin + 92, y);
        doc.text('STATUS', margin + 130, y);
        doc.text('AMOUNT', margin + 155, y);

        y += 2;
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;

        doc.setFont('courier', 'normal');

        if (timeFilteredDebts.length === 0) {
          doc.text('No debts recorded for this period.', margin, y);
          y += 6;
        } else {
          timeFilteredDebts.forEach((d) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
              doc.setFont('courier', 'bold');
              doc.text('DATE', margin, y);
              doc.text('CUSTOMER', margin + 22, y);
              doc.text('PHONE', margin + 62, y);
              doc.text('ITEM/INFO', margin + 92, y);
              doc.text('STATUS', margin + 130, y);
              doc.text('AMOUNT', margin + 155, y);
              y += 2;
              doc.line(margin, y, pageWidth - margin, y);
              y += 4;
              doc.setFont('courier', 'normal');
            }
            const dateStr = (d.date || d.createdAt || '').substring(0, 10);
            const cust = d.customerName.length > 20 ? d.customerName.substring(0, 18) + '..' : d.customerName;
            const phone = (d.phone || '-').length > 15 ? (d.phone || '-').substring(0, 13) + '..' : (d.phone || '-');
            const item = (d.productTaken || d.description || '-').length > 18 ? (d.productTaken || d.description || '-').substring(0, 16) + '..' : (d.productTaken || d.description || '-');
            const status = (d.status || (d.isPaid ? 'paid' : 'unpaid')).toUpperCase();

            doc.text(dateStr, margin, y);
            doc.text(cust, margin + 22, y);
            doc.text(phone, margin + 62, y);
            doc.text(item, margin + 92, y);
            doc.text(status, margin + 130, y);
            doc.text(`${currency} ${d.amount.toLocaleString()}`, margin + 155, y);
            y += 4;
          });
        }

        const pdfFilename = `Debts_Report_${debtTimeFilter}_${new Date().toISOString().split('T')[0]}.pdf`;
        const res = await saveJsPdf(doc, pdfFilename, 'Debts Report', { folder: 'reports' });
        if (res.success) {
          showToast(res.message);
        } else {
          showToast('Failed to export PDF');
        }
        return;
      }

      // -------------------------------------------------------------
      // 6. BUSINESS REPORT (COMBINED OVERVIEW FOR REPORT TAB)
      // -------------------------------------------------------------
      const reportTitle = 'BUSINESS PERFORMANCE & INVENTORY REPORT';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(reportTitle, pageWidth / 2, y, { align: 'center' });
      y += 7;

      if (business?.name) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(business.name, pageWidth / 2, y, { align: 'center' });
        y += 5;
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Period: ${getReportPeriodTitle()} • Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Executive Financial Summary
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Financial & Operational Summary', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Total Sales (Inc. Staff Logged): ${currency} ${periodTotalSales.toLocaleString()}`, margin, y);
      y += 5;
      doc.text(`Staff Logged Sales Volume: ${currency} ${workerPeriodSalesAnalytics.totalStaffSalesVolume.toLocaleString()} (${workerPeriodSalesAnalytics.periodStaffSales.length} records)`, margin, y);
      y += 5;
      doc.text(`Gross Sales Profit: ${currency} ${periodTotalProfit.toLocaleString()}`, margin, y);
      y += 5;
      doc.text(`Total Period Expenses: ${currency} ${reportMetrics.totalExpenses.toLocaleString()}`, margin, y);
      y += 5;
      const netProfit = periodTotalProfit - reportMetrics.totalExpenses;
      doc.text(`Net Estimated Income: ${currency} ${netProfit.toLocaleString()}`, margin, y);
      y += 5;
      doc.text(`Stock Asset Value: ${currency} ${stockAnalytics.totalCostValue.toLocaleString()} (${stockAnalytics.totalItems} units available)`, margin, y);
      y += 5;
      doc.text(`Agent Owed Balance: ${currency} ${agentPeriodAnalytics.totalRemainingBalance.toLocaleString()} (${agentPeriodAnalytics.totalConsignmentTaken.toLocaleString()} taken)`, margin, y);
      y += 5;
      doc.text(`Customer Outstanding Debts: ${currency} ${totalOutstandingDebts.toLocaleString()}`, margin, y);
      y += 10;

      // Sales Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Sales History', margin, y);
      y += 6;
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);

      doc.text('DATE', margin, y);
      doc.text('PRODUCT', margin + 25, y);
      doc.text('QTY', margin + 85, y);
      doc.text('TOTAL', margin + 100, y);
      doc.text('PROFIT', margin + 130, y);

      y += 2;
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;

      doc.setFont('courier', 'normal');

      periodSales.forEach((s) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
          doc.setFont('courier', 'bold');
          doc.text('DATE', margin, y);
          doc.text('PRODUCT', margin + 25, y);
          doc.text('QTY', margin + 85, y);
          doc.text('TOTAL', margin + 100, y);
          doc.text('PROFIT', margin + 130, y);
          y += 2;
          doc.line(margin, y, pageWidth - margin, y);
          y += 4;
          doc.setFont('courier', 'normal');
        }
        const dateStr = (s.date || s.createdAt || '').substring(0, 10);
        const prodName = s.productName.length > 25 ? s.productName.substring(0, 23) + '..' : s.productName;
        doc.text(dateStr, margin, y);
        doc.text(prodName, margin + 25, y);
        doc.text(String(s.quantity), margin + 85, y);
        doc.text(`${s.totalPrice.toLocaleString()}`, margin + 100, y);
        doc.text(`${s.profit.toLocaleString()}`, margin + 130, y);
        y += 4;
      });

      y += 8;
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      // Stock Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Current Stock Overview', margin, y);
      y += 6;
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);

      doc.text('PRODUCT', margin, y);
      doc.text('STOCK', margin + 65, y);
      doc.text('COST', margin + 85, y);
      doc.text('SELL', margin + 115, y);
      doc.text('VALUE', margin + 145, y);

      y += 2;
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;

      doc.setFont('courier', 'normal');

      products.forEach((p) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
          doc.setFont('courier', 'bold');
          doc.text('PRODUCT', margin, y);
          doc.text('STOCK', margin + 65, y);
          doc.text('COST', margin + 85, y);
          doc.text('SELL', margin + 115, y);
          doc.text('VALUE', margin + 145, y);
          y += 2;
          doc.line(margin, y, pageWidth - margin, y);
          y += 4;
          doc.setFont('courier', 'normal');
        }
        const prodName = p.name.length > 30 ? p.name.substring(0, 28) + '..' : p.name;
        doc.text(prodName, margin, y);
        doc.text(String(p.quantity), margin + 65, y);
        doc.text(`${p.costPrice.toLocaleString()}`, margin + 85, y);
        doc.text(`${p.sellingPrice.toLocaleString()}`, margin + 115, y);
        doc.text(`${(p.quantity * p.sellingPrice).toLocaleString()}`, margin + 145, y);
        y += 4;
      });

      // Agent Consignment & Ledger Overview Table
      y += 8;
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Agent Consignment & Ledger Summary', margin, y);
      y += 6;
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);

      doc.text('AGENT', margin, y);
      doc.text('SHOP/LOC', margin + 50, y);
      doc.text('TAKEN VALUE', margin + 95, y);
      doc.text('CASH PAID', margin + 130, y);
      doc.text('OWED BAL', margin + 160, y);

      y += 2;
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;

      doc.setFont('courier', 'normal');

      agentPeriodAnalytics.agentBreakdown.forEach((ab) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
          doc.setFont('courier', 'bold');
          doc.text('AGENT', margin, y);
          doc.text('SHOP/LOC', margin + 50, y);
          doc.text('TAKEN VALUE', margin + 95, y);
          doc.text('CASH PAID', margin + 130, y);
          doc.text('OWED BAL', margin + 160, y);
          y += 2;
          doc.line(margin, y, pageWidth - margin, y);
          y += 4;
          doc.setFont('courier', 'normal');
        }
        const name = ab.agent.agentName.length > 22 ? ab.agent.agentName.substring(0, 20) + '..' : ab.agent.agentName;
        const shop = (ab.agent.shopName || '-').length > 20 ? (ab.agent.shopName || '-').substring(0, 18) + '..' : (ab.agent.shopName || '-');
        doc.text(name, margin, y);
        doc.text(shop, margin + 50, y);
        doc.text(`${ab.takenValue.toLocaleString()}`, margin + 95, y);
        doc.text(`${ab.cashPaid.toLocaleString()}`, margin + 130, y);
        doc.text(`${ab.remainingBalance.toLocaleString()}`, margin + 160, y);
        y += 4;
      });

      // Staff Sales & Performance Overview Table
      y += 8;
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Staff Sales & Commission Summary', margin, y);
      y += 6;
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);

      doc.text('STAFF MEMBER', margin, y);
      doc.text('ROLE', margin + 55, y);
      doc.text('SALES QTY', margin + 95, y);
      doc.text('TOTAL SALES', margin + 125, y);
      doc.text('COMMISSION', margin + 160, y);

      y += 2;
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;

      doc.setFont('courier', 'normal');

      workerPeriodSalesAnalytics.workerBreakdown.forEach((wb) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
          doc.setFont('courier', 'bold');
          doc.text('STAFF MEMBER', margin, y);
          doc.text('ROLE', margin + 55, y);
          doc.text('SALES QTY', margin + 95, y);
          doc.text('TOTAL SALES', margin + 125, y);
          doc.text('COMMISSION', margin + 160, y);
          y += 2;
          doc.line(margin, y, pageWidth - margin, y);
          y += 4;
          doc.setFont('courier', 'normal');
        }
        const wName = wb.worker.name.length > 24 ? wb.worker.name.substring(0, 22) + '..' : wb.worker.name;
        const wRole = (wb.worker.role || '-').length > 18 ? (wb.worker.role || '-').substring(0, 16) + '..' : (wb.worker.role || '-');
        doc.text(wName, margin, y);
        doc.text(wRole, margin + 55, y);
        doc.text(String(wb.salesCount), margin + 95, y);
        doc.text(`${wb.totalSales.toLocaleString()}`, margin + 125, y);
        doc.text(`${wb.totalCommission.toLocaleString()}`, margin + 160, y);
        y += 4;
      });

      const pdfFilename = `Business_Report_${reportTimeFilter}_${new Date().toISOString().split('T')[0]}.pdf`;
      const res = await saveJsPdf(doc, pdfFilename, 'Business Report', { folder: 'reports' });
      if (res.success) {
        showToast(res.message);
      } else {
        showToast('Failed to export PDF');
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      showToast('Failed to export PDF');
    }
  };


  const renderAddProductForm = () => {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xl border border-sky-100 dark:border-slate-800 animate-fadeIn">
        {editingProductId && (
          <div className="mb-4 flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Editing Product #{itemId}</span>
            <button
              type="button"
              onClick={() => {
                setEditingProductId(null);
                setName('');
                setImage(undefined);
                setSelectedSizes([]);
                setQuantity(1);
                setCostPrice('0.0');
                setSellingPrice('0.0');
                setItemId(StorageService.getNextInventoryItemId());
              }}
              className="font-bold text-amber-700 underline"
            >
              Cancel Edit
            </button>
          </div>
        )}

        <form onSubmit={handleSaveProduct} className="space-y-4">
          {/* Product Photo Upload - Circular Aperture Icon */}
          <div className="flex flex-col items-center justify-center pt-1 pb-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={isCompressingImage}
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 relative overflow-hidden group shadow-inner"
              title="Upload product photo"
            >
              {isCompressingImage ? (
                <div className="flex flex-col items-center justify-center text-sky-600 dark:text-sky-400 p-1">
                  <Loader2 className="w-6 h-6 animate-spin mb-1" />
                  <span className="text-[9px] font-bold">Optimizing...</span>
                </div>
              ) : image ? (
                <img src={image} alt="Product" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 group-hover:scale-105 transition-transform">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-300 dark:border-slate-600 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-slate-400" />
                  </div>
                </div>
              )}
            </button>
            {image && (
              <button
                type="button"
                onClick={() => setImage(undefined)}
                className="text-[11px] text-rose-500 font-semibold mt-1.5 hover:underline"
              >
                Remove Photo
              </button>
            )}
          </div>

          {/* ITEM ID (With AUTO button & Duplicate Warning) */}
          {(() => {
            const trimmedInputId = itemId.trim();
            const duplicateProduct = trimmedInputId
              ? products.find(
                  (p) => p.itemId.trim().toLowerCase() === trimmedInputId.toLowerCase() && p.id !== editingProductId
                )
              : null;

            return (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  ITEM ID
                </label>
                <div className="relative flex items-center">
                  <input
                    id="input-product-item-id"
                    type="text"
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:outline-none pr-24 ${
                      duplicateProduct
                        ? 'border-rose-500 focus:ring-rose-500 text-rose-600 dark:text-rose-400'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-sky-500'
                    }`}
                    placeholder="e.g. 1"
                  />
                  <div className="absolute right-1.5 flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setIsAddProductBarcodeScannerOpen(true)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700 dark:hover:text-sky-400 rounded-lg transition"
                      title="Scan Barcode"
                    >
                      <Scan className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={autoGenerateItemId}
                      className="px-2.5 py-1.5 text-xs font-extrabold text-sky-600 dark:text-sky-400 uppercase hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition"
                    >
                      AUTO
                    </button>
                  </div>
                </div>
                {duplicateProduct && (
                  <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1">
                    <span>⚠️ ID #{trimmedInputId} is already used by "{duplicateProduct.name}". Please choose another ID or tap AUTO.</span>
                  </p>
                )}
              </div>
            );
          })()}

          {/* ITEM NAME */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              ITEM NAME
            </label>
            <input
              id="input-product-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nike Air Max, White Shirt"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              required
            />
          </div>

          {/* CATEGORY */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                CATEGORY
              </label>
            </div>
            <div className="flex gap-2">
              <select
                value={productCategoryId}
                onChange={(e) => setProductCategoryId(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="">No Category</option>
                {productCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowInlineCategoryInput(!showInlineCategoryInput)}
                className="px-3.5 py-3 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-100 dark:border-sky-800 text-sky-600 dark:text-sky-400 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
                title="Create new category"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[11px]">New</span>
              </button>
            </div>

            {/* Quick Inline Category Creation */}
            {showInlineCategoryInput && (
              <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 animate-fadeIn">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Quick Add Category
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickCategoryName}
                    onChange={(e) => setQuickCategoryName(e.target.value)}
                    placeholder="e.g. Shoes, Accessories"
                    className="flex-1 px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateQuickCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateQuickCategory}
                    className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-extrabold rounded-xl shadow-xs transition active:scale-95 shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* + Add Size (Expandable variant options) */}
          <div className="pt-1">
            {!showSizes ? (
              selectedSizes.length > 0 ? (
                <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>{selectedSizes.length} {selectedSizes.length === 1 ? 'Size' : 'Sizes'} Added</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSizes(true)}
                      className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      + Add More / Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSizes.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700 shadow-2xs"
                      >
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => removeSizeTag(s)}
                          className="text-slate-400 hover:text-rose-500 transition ml-0.5"
                          title={`Remove size ${s}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSizes(true)}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1.5 py-0.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Sizes</span>
                </button>
              )
            ) : (
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-white block">
                      Product Sizes
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSizes(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                  >
                    Done
                  </button>
                </div>

                {/* Active Added Sizes List */}
                {selectedSizes.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                        Added Sizes ({selectedSizes.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes([])}
                        className="text-[11px] text-rose-500 hover:underline font-semibold"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {selectedSizes.map((size) => (
                        <span
                          key={size}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-sky-600 text-white shadow-2xs"
                        >
                          <span>{size}</span>
                          <button
                            type="button"
                            onClick={() => removeSizeTag(size)}
                            className="hover:bg-white/20 rounded-full p-0.5 transition"
                            title={`Remove size ${size}`}
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input to type ANY custom size or comma-separated sizes */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Type size or comma-separated list
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="input-product-sizes"
                      type="text"
                      value={customSizeInput}
                      onChange={(e) => setCustomSizeInput(e.target.value)}
                      placeholder="e.g. 38, 39, 40, 41, 42 or S, M, L, XL"
                      className="flex-1 px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSizesFromInput();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addSizesFromInput}
                      className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold rounded-xl shadow-xs transition active:scale-95 shrink-0"
                    >
                      + Add Size
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Type size and press Enter, or separate multiple with commas.
                  </p>
                </div>

                {/* Sizes chips: XS, S, M, L, XL, XXL, etc. */}
                <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Sizes:
                    </span>
                    <button
                      type="button"
                      onClick={() => addPresetGroup(['S', 'M', 'L', 'XL', 'XXL'])}
                      className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-md hover:bg-sky-100 transition"
                    >
                      + Add S to XXL
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_SIZES.map((size) => {
                      const isSelected = selectedSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSizeTag(size)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QUANTITY */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                TOTAL QUANTITY IN STOCK
              </label>
              {selectedSizes.length > 0 && (
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">
                  Across {selectedSizes.length} {selectedSizes.length === 1 ? 'size' : 'sizes'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(0, q - 1))}
                className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-lg active:scale-95 transition"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                id="input-product-quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="flex-1 text-center px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-lg active:scale-95 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* COST PRICE & SELLING PRICE (2 Columns) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                COST PRICE
              </label>
              <div className="relative flex items-center">
                <input
                  id="input-product-cost-price"
                  type="number"
                  step="any"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none pr-12"
                />
                <span className="absolute right-3 text-xs font-bold text-slate-400 pointer-events-none">
                  {currency}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                SELLING PRICE
              </label>
              <div className="relative flex items-center">
                <input
                  id="input-product-selling-price"
                  type="number"
                  step="any"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none pr-12"
                />
                <span className="absolute right-3 text-xs font-bold text-slate-400 pointer-events-none">
                  {currency}
                </span>
              </div>
            </div>
          </div>

          {/* TAX PERCENT */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Tax Percent
            </label>
            <div className="relative flex items-center">
              <input
                id="input-product-tax-percent"
                type="number"
                step="any"
                min="0"
                max="100"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none pr-10"
              />
              <span className="absolute right-3 text-xs font-bold text-slate-400 pointer-events-none">
                %
              </span>
            </div>
            <p className="text-[11px] text-slate-400 pt-0.5">
              Ignore taxes if already included in cost price.
            </p>
          </div>

          {/* SAVE BUTTON */}
          <div className="pt-2">
            <button
              id="btn-inventory-save-product"
              type="submit"
              className="w-full py-4 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-sky-600/30 active:scale-[0.99] transition"
            >
              {editingProductId ? 'UPDATE PRODUCT' : 'SAVE'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${currentCategory === null ? 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-36 sm:pb-40' : 'bg-[#0284c7] text-slate-900 dark:text-slate-100 pb-24'} flex flex-col transition-colors`}>
      {/* Toast alert (Centered prominently in screen) */}
      {toastMessage && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 pointer-events-none z-[99999] flex items-center justify-center p-4">
          <div className="pointer-events-auto max-w-sm sm:max-w-md w-auto px-5 py-3.5 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-white text-xs sm:text-sm font-bold shadow-2xl border border-emerald-500/40 flex items-center gap-3 backdrop-blur-md animate-bounce">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="leading-snug">{toastMessage}</span>
          </div>
        </div>,
        document.body
      )}

      {/* TOP APP BAR */}
      <div className="bg-[#0284c7] text-white pt-3 pb-2 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (currentCategory !== null) {
                  setCurrentCategory(null);
                } else {
                  onNavigateHome();
                }
              }}
              className="p-1 -ml-1 rounded-full hover:bg-white/10 transition text-white"
              title={currentCategory !== null ? 'Back to Inventory' : 'Return to Home'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
              {currentCategory === 'products' && <Package className="w-4 h-4" />}
              {currentCategory === 'money' && <DollarSign className="w-4 h-4" />}
              {currentCategory === 'people' && <Users className="w-4 h-4" />}
              {currentCategory === null && <User className="w-4 h-4" />}
            </div>
            <span className="font-bold text-base tracking-tight truncate max-w-[180px] sm:max-w-xs">
              {currentCategory === 'products'
                ? 'Products'
                : currentCategory === 'money'
                ? 'Money'
                : currentCategory === 'people'
                ? 'People'
                : business.name || 'Inventory'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                refreshData();
                showToast('All inventory sections synced with Cloud Storage!');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition active:scale-95 border border-white/30 shadow-xs"
              title="All inventory sections (Stock, Sales, Expenses, Debts, Shopping List, Customers, Agents, Staff, Reports) save to Cloud Storage"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-100" />
              <span>Cloud Sync</span>
            </button>
            <button
              onClick={onNavigateHome}
              className="text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg font-medium transition"
            >
              Home
            </button>
          </div>
        </div>

        {/* SINGLE TAB BAR ROW (EXACTLY ONE ROW PER SCREEN, ONLY SHOWN INSIDE A CATEGORY) */}
        {currentCategory !== null && (
          <div className="max-w-xl mx-auto mt-3 pb-1">
            {/* 1. PRODUCTS PAGE: ONLY 3 TABS (STOCK, SALES, LIST) - MONEY & PEOPLE ARE HIDDEN */}
            {currentCategory === 'products' && (
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/15 dark:bg-black/25 rounded-2xl border border-white/20 shadow-inner animate-fadeIn">
                <button
                  id="tab-inventory-stock"
                  type="button"
                  onClick={() => setActiveTab('stock')}
                  className={`py-2 px-1 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'stock'
                      ? 'bg-white text-sky-950 shadow-sm'
                      : 'text-sky-100 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="tracking-wider uppercase text-[10px] sm:text-xs">Stock</span>
                </button>

                <button
                  id="tab-inventory-sales"
                  type="button"
                  onClick={() => setActiveTab('sales')}
                  className={`py-2 px-1 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'sales'
                      ? 'bg-white text-sky-950 shadow-sm'
                      : 'text-sky-100 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span className="tracking-wider uppercase text-[10px] sm:text-xs">Sales</span>
                </button>

                <button
                  id="tab-inventory-shopping-list"
                  type="button"
                  onClick={() => setActiveTab('shoppingList')}
                  className={`py-2 px-1 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'shoppingList'
                      ? 'bg-white text-sky-950 shadow-sm'
                      : 'text-sky-100 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="tracking-wider uppercase text-[10px] sm:text-xs">List</span>
                </button>
              </div>
            )}

            {/* 2. MONEY PAGE: ONLY 3 TABS (EXPENSES, DEBTS, REPORT) - PRODUCTS & PEOPLE ARE HIDDEN */}
            {currentCategory === 'money' && (
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/15 dark:bg-black/25 rounded-2xl border border-white/20 shadow-inner animate-fadeIn">
                <button
                  id="tab-inventory-expense"
                  type="button"
                  onClick={() => setActiveTab('expense')}
                  className={`py-2 px-1 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'expense'
                      ? 'bg-white text-sky-950 shadow-sm'
                      : 'text-sky-100 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <ReceiptIcon className="w-4 h-4" />
                  <span className="tracking-wider uppercase text-[10px] sm:text-xs">Expenses</span>
                </button>

                <button
                  id="tab-inventory-debts"
                  type="button"
                  onClick={() => setActiveTab('debts')}
                  className={`py-2 px-1 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'debts'
                      ? 'bg-white text-sky-950 shadow-sm'
                      : 'text-sky-100 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="tracking-wider uppercase text-[10px] sm:text-xs">Debts</span>
                </button>

                <button
                  id="tab-inventory-report"
                  type="button"
                  onClick={() => setActiveTab('report')}
                  className={`py-2 px-1 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'report'
                      ? 'bg-white text-sky-950 shadow-sm'
                      : 'text-sky-100 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span className="tracking-wider uppercase text-[10px] sm:text-xs">Report</span>
                </button>
              </div>
            )}

            {/* 3. PEOPLE PAGE: ONLY 3 TABS (CLIENT, AGENT, STAFF) - PRODUCTS & MONEY ARE HIDDEN */}
            {currentCategory === 'people' && (
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/15 dark:bg-black/25 rounded-2xl border border-white/20 shadow-inner animate-fadeIn">
                <button
                  id="tab-inventory-clients"
                  type="button"
                  onClick={() => setActiveTab('customers')}
                  className={`py-2 px-1 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'customers'
                      ? 'bg-white text-sky-950 shadow-sm'
                      : 'text-sky-100 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="tracking-wider uppercase text-[10px] sm:text-xs">Client</span>
                </button>

                <button
                  id="tab-inventory-agents"
                  type="button"
                  onClick={() => setActiveTab('agents')}
                  className={`py-2 px-1 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'agents'
                      ? 'bg-white text-sky-950 shadow-sm'
                      : 'text-sky-100 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span className="tracking-wider uppercase text-[10px] sm:text-xs">Agent</span>
                </button>

                <button
                  id="tab-inventory-workers"
                  type="button"
                  onClick={() => setActiveTab('workers')}
                  className={`py-2 px-1 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'workers'
                      ? 'bg-white text-sky-950 shadow-sm'
                      : 'text-sky-100 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span className="tracking-wider uppercase text-[10px] sm:text-xs">Staff</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TAB CONTENT CONTAINER */}
      <div className="max-w-xl mx-auto w-full px-4 pt-4 flex-1">
        {/* MAIN INVENTORY SCREEN BODY: 3 BIG ACTION BUTTONS */}
        {currentCategory === null && (
          <div className="space-y-4 py-2 animate-fadeIn pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* BUTTON 1: PRODUCTS */}
              <button
                id="btn-main-products"
                type="button"
                onClick={() => {
                  setCurrentCategory('products');
                  setActiveTab('stock');
                }}
                className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-sm shadow-sky-600/20 active:scale-[0.99] transition-all overflow-hidden border border-sky-500/50 text-left min-h-[96px] sm:min-h-[108px] cursor-pointer"
              >
                <div className="flex items-start justify-between w-full mb-2">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-white" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md sm:rounded-lg bg-white/15 text-[10px] sm:text-xs font-semibold text-sky-100 group-hover:bg-white/25 transition">
                    <span>Open</span>
                    <ArrowUpRight className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div>
                  <div className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight uppercase">
                    PRODUCTS
                  </div>
                  <p className="text-[11px] sm:text-xs text-sky-100/90 font-normal mt-0.5 leading-snug">
                    Stock, Sales, List
                  </p>
                </div>
              </button>

              {/* BUTTON 2: MONEY */}
              <button
                id="btn-main-money"
                type="button"
                onClick={() => {
                  setCurrentCategory('money');
                  setActiveTab('expense');
                }}
                className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold shadow-sm shadow-emerald-600/20 active:scale-[0.99] transition-all overflow-hidden border border-emerald-500/40 text-left min-h-[96px] sm:min-h-[108px] cursor-pointer"
              >
                <div className="flex items-start justify-between w-full mb-2">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-white" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md sm:rounded-lg bg-white/20 text-[10px] sm:text-xs font-semibold text-white group-hover:bg-white/30 transition">
                    <span>Open</span>
                    <ArrowUpRight className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div>
                  <div className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight uppercase">
                    MONEY
                  </div>
                  <p className="text-[11px] sm:text-xs text-emerald-100/90 font-normal mt-0.5 leading-snug">
                    Expenses, Debts, Report
                  </p>
                </div>
              </button>

              {/* BUTTON 3: PEOPLE */}
              <button
                id="btn-main-people"
                type="button"
                onClick={() => {
                  setCurrentCategory('people');
                  setActiveTab('customers');
                }}
                className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-sm shadow-teal-600/20 active:scale-[0.99] transition-all overflow-hidden border border-teal-500/50 text-left min-h-[96px] sm:min-h-[108px] cursor-pointer"
              >
                <div className="flex items-start justify-between w-full mb-2">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-white" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md sm:rounded-lg bg-white/15 text-[10px] sm:text-xs font-semibold text-teal-100 group-hover:bg-white/25 transition">
                    <span>Open</span>
                    <ArrowUpRight className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div>
                  <div className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight uppercase">
                    PEOPLE
                  </div>
                  <p className="text-[11px] sm:text-xs text-teal-100/90 font-normal mt-0.5 leading-snug">
                    Clients, Agent, Staff
                  </p>
                </div>
              </button>
            </div>

            {/* Native Advanced Ad below main inventory boxes */}
            <div className="pt-2">
              <AdMobNativeAd
                context="inventory"
                variant="compact"
                unitId={ADMOB_UNITS.NATIVE_ADVANCED}
              />
            </div>
          </div>
        )}
        {/* ==================================================================== */}
        {/* SECTION 2: SALES TAB (Screenshot 2)                                  */}
        {/* ==================================================================== */}
        {currentCategory === 'products' && activeTab === 'sales' && (
          <div className="space-y-3 animate-fadeIn">
            {/* Top of Sales Page: Add Sale Button */}
            <button
              id="btn-add-sale"
              type="button"
              onClick={() => setShowSaleForm((prev) => !prev)}
              className={`w-full py-3 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99] ${
                showSaleForm
                  ? 'bg-white/20 dark:bg-slate-800 text-white border border-white/30 hover:bg-white/30'
                  : 'bg-white text-[#0284c7] hover:bg-sky-50 shadow-sky-900/10'
              }`}
            >
              {showSaleForm ? (
                <>
                  <X className="w-4 h-4" /> Close Sale Form
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-[#0284c7]" /> Add Sale
                </>
              )}
            </button>

            {/* Collapsible Sold Details Form Card (Shown when Add Sale is clicked) */}
            {showSaleForm && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-lg border border-sky-100 dark:border-slate-800 space-y-4 animate-fadeIn">
                {/* FORM: SOLD DETAILS */}
                <form onSubmit={handleRecordSale} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        Sold details
                      </h3>
                      <p className="text-[11px] text-slate-400">Tap the date to back-date.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Date Picker Pill */}
                      <div className="relative">
                        <input
                          type="date"
                          value={saleDate}
                          onChange={(e) => setSaleDate(e.target.value)}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                        />
                        <div className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-sky-600" />
                          <span>{new Date(saleDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowSaleForm(false)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Close form"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* SECTION 1: PRODUCT NAME / STOCK SEARCH */}
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        PRODUCT NAME
                      </label>
                      <div className="flex items-center gap-2">
                        {products.length > 0 ? (
                          <select
                            aria-label="Pick Product from Stock"
                            value={selectedProductForSale?.id || ''}
                            onChange={(e) => {
                              const found = products.find((p) => p.id === e.target.value);
                              if (found) {
                                handleSelectProductForSale(found);
                              }
                            }}
                            className="text-[10px] font-bold py-0.5 px-2 rounded-lg bg-sky-50 dark:bg-slate-700 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-slate-600 cursor-pointer focus:outline-none"
                          >
                            <option value="">Pick from Stock ▾</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (#{p.itemId})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              showToast('No products in stock yet. Please add products in the Stock tab first.');
                            }}
                            className="text-[10px] font-bold py-0.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition"
                          >
                            Pick from Stock ▾
                          </button>
                        )}

                        {selectedProductForSale && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForSale(null);
                              setSaleItemId('');
                              setSaleSearchQuery('');
                              setSaleSelectedSize('');
                            }}
                            className="text-[11px] text-rose-500 hover:underline"
                          >
                            Clear Selection
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        id="input-sale-product-name"
                        type="text"
                        value={saleSearchQuery}
                        onChange={(e) => {
                          setSaleSearchQuery(e.target.value);
                          if (selectedProductForSale && selectedProductForSale.name !== e.target.value) {
                            setSelectedProductForSale(null);
                          }
                        }}
                        placeholder="Enter product name..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        required
                      />
                    </div>

                    {/* Stock Autocomplete dropdown if query typed and no specific product selected */}
                    {saleSearchQuery && !selectedProductForSale && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg divide-y divide-slate-100 dark:divide-slate-700">
                        {products
                          .filter(
                            (p) =>
                              p.name.toLowerCase().includes(saleSearchQuery.toLowerCase()) ||
                              p.itemId.toLowerCase().includes(saleSearchQuery.toLowerCase())
                          )
                          .map((prod) => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleSelectProductForSale(prod)}
                              className="w-full px-3 py-2.5 text-left text-xs hover:bg-sky-50 dark:hover:bg-slate-700 flex items-center justify-between transition"
                            >
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  #{prod.itemId} {prod.name}
                                </span>
                                <span className="text-[11px] text-slate-400 block">
                                  Stock: {prod.quantity} units
                                </span>
                              </div>
                              <span className="font-bold text-sky-600 dark:text-sky-400 font-mono">
                                {currency} {prod.sellingPrice.toLocaleString()}
                              </span>
                            </button>
                          ))}
                      </div>
                    )}

                    {selectedProductForSale && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Selected: #{selectedProductForSale.itemId} ({selectedProductForSale.quantity} available in stock)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductForSale(null);
                            setSaleItemId('');
                            setSaleSearchQuery('');
                            setSaleSelectedSize('');
                          }}
                          className="text-rose-500 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: PRODUCT ID */}
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        PRODUCT ID
                      </label>
                      {selectedProductForSale && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          #{selectedProductForSale.itemId} matched
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        id="input-sale-product-id"
                        type="text"
                        value={saleItemId}
                        onChange={(e) => handleSaleItemIdChange(e.target.value)}
                        placeholder="e.g. 1"
                        className="w-full pl-10 pr-24 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                      <div className="absolute right-2">
                        {products.length > 0 ? (
                          <select
                            aria-label="Pick Product ID"
                            value={selectedProductForSale?.id || ''}
                            onChange={(e) => {
                              const found = products.find((p) => p.id === e.target.value);
                              if (found) {
                                handleSelectProductForSale(found);
                              }
                            }}
                            className="text-[11px] font-bold py-1 px-2 rounded-lg bg-sky-50 dark:bg-slate-700 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-slate-600 cursor-pointer focus:outline-none"
                          >
                            <option value="">Pick ID ▾</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                #{p.itemId} - {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              showToast('No products in stock yet. Please add products in the Stock tab first.');
                            }}
                            className="text-[11px] font-bold py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition"
                            title="No products in stock yet"
                          >
                            Pick ID ▾
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Stock Autocomplete dropdown when typing Product ID */}
                    {saleItemId && !selectedProductForSale && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-44 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg divide-y divide-slate-100 dark:divide-slate-700">
                        {products
                          .filter((p) =>
                            p.itemId.toLowerCase().includes(saleItemId.toLowerCase())
                          )
                          .map((prod) => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleSelectProductForSale(prod)}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-sky-50 dark:hover:bg-slate-700 flex items-center justify-between transition"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                                  #{prod.itemId}
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                                  {prod.name}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-sky-600 dark:text-sky-400 font-mono block">
                                  {currency} {prod.sellingPrice.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Stock: {prod.quantity}
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Size Selector for Sold Product (if product has sizes) */}
                  {selectedProductForSale && selectedProductForSale.sizes && selectedProductForSale.sizes.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 space-y-1.5 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                          Size Sold (Optional):
                        </span>
                        {saleSelectedSize && (
                          <button
                            type="button"
                            onClick={() => setSaleSelectedSize('')}
                            className="text-[10px] text-rose-500 hover:underline"
                          >
                            Deselect
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProductForSale.sizes.map((sz) => {
                          const isSelected = saleSelectedSize === sz;
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setSaleSelectedSize((prev) => (prev === sz ? '' : sz))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                isSelected
                                  ? 'bg-sky-600 text-white shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION: CATEGORY */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Category
                      </label>
                      {saleCategoryId && (
                        <button
                          type="button"
                          onClick={() => setSaleCategoryId('')}
                          className="text-[10px] text-rose-500 hover:underline"
                        >
                          Clear Category
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <select
                        id="select-sale-category"
                        aria-label="Sale Category"
                        value={saleCategoryId}
                        onChange={(e) => setSaleCategoryId(e.target.value)}
                        className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      >
                        <option value="">No Category / General</option>
                        {productCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <button
                        id="btn-new-sale-category"
                        type="button"
                        onClick={() => setShowSaleCategoryInput(!showSaleCategoryInput)}
                        className="px-3 py-2 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-100 dark:border-sky-800 text-sky-600 dark:text-sky-400 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition active:scale-95 shrink-0"
                        title="Create new category"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="text-[11px]">New</span>
                      </button>
                    </div>

                    {/* Inline Quick Category Creation for Sale Form */}
                    {showSaleCategoryInput && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 animate-fadeIn">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Create New Category
                        </span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={saleQuickCategoryName}
                            onChange={(e) => setSaleQuickCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateSaleQuickCategory();
                              }
                            }}
                            placeholder="e.g. Groceries, Shoes, Electronics..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1.5 focus:ring-sky-500"
                          />
                          <button
                            type="button"
                            onClick={handleCreateSaleQuickCategory}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition shadow-xs"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantity Sold & Stock Balance Tracker */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Quantity Sold
                      </label>
                      {selectedProductForSale && (
                        <span
                          className={`text-[11px] font-extrabold ${
                            selectedProductForSale.quantity - saleQuantity < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : selectedProductForSale.quantity - saleQuantity === 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {selectedProductForSale.quantity} in stock •{' '}
                          {selectedProductForSale.quantity - saleQuantity >= 0
                            ? `${selectedProductForSale.quantity - saleQuantity} balance left`
                            : `${Math.abs(selectedProductForSale.quantity - saleQuantity)} over stock!`}
                        </span>
                      )}
                    </div>

                    {/* Stepper Buttons and Input */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaleQuantityChange(saleQuantity - 1)}
                        disabled={saleQuantity <= 1}
                        className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-lg active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none"
                        title="Decrease quantity by 1"
                      >
                        <Minus className="w-5 h-5" />
                      </button>

                      <div className="flex-1 relative">
                        <input
                          id="input-sale-quantity"
                          type="number"
                          min="1"
                          value={saleQuantity}
                          onChange={(e) => handleSaleQuantityChange(parseInt(e.target.value, 10) || 1)}
                          placeholder="1"
                          className="w-full text-center px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-base focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                          {saleQuantity === 1 ? 'unit' : 'units'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaleQuantityChange(saleQuantity + 1)}
                        className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-lg active:scale-95 transition"
                        title="Increase quantity by 1"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Stock Balance & Calculation Breakdown Card */}
                    {selectedProductForSale && (
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-50/70 to-slate-50 dark:from-slate-800/80 dark:to-slate-800/40 border border-sky-100 dark:border-slate-700 space-y-2 mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                            Stock Balance & Breakdown
                          </span>
                          {selectedProductForSale.quantity - saleQuantity >= 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              {selectedProductForSale.quantity - saleQuantity === 0
                                ? 'All Stock Sold'
                                : 'Stock Available'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                              <AlertTriangle className="w-3 h-3" />
                              Exceeds Stock
                            </span>
                          )}
                        </div>

                        {/* 3 Step Visual: In Stock -> Selling -> Remaining Balance */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              In Stock
                            </span>
                            <span className="text-sm font-extrabold text-slate-800 dark:text-white">
                              {selectedProductForSale.quantity}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-200 dark:border-sky-800 shadow-2xs">
                            <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-300 block">
                              Selling Now
                            </span>
                            <span className="text-sm font-extrabold text-sky-600 dark:text-sky-400">
                              -{saleQuantity}
                            </span>
                          </div>
                          <div
                            className={`p-2 rounded-xl border shadow-2xs ${
                              selectedProductForSale.quantity - saleQuantity < 0
                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                                : selectedProductForSale.quantity - saleQuantity === 0
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                              Balance Left
                            </span>
                            <span
                              className={`text-sm font-extrabold ${
                                selectedProductForSale.quantity - saleQuantity < 0
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : selectedProductForSale.quantity - saleQuantity === 0
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {selectedProductForSale.quantity - saleQuantity}
                            </span>
                          </div>
                        </div>

                        {/* Pricing and Profit Breakdown */}
                        <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-300 space-y-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Unit Selling Price:</span>
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                              {currency} {selectedProductForSale.sellingPrice.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Total Calculation:</span>
                            <span className="font-bold text-sky-600 dark:text-sky-400">
                              {saleQuantity} × {currency} {selectedProductForSale.sellingPrice.toLocaleString()} = {currency}{' '}
                              {(selectedProductForSale.sellingPrice * saleQuantity).toLocaleString()}
                            </span>
                          </div>
                          {selectedProductForSale.costPrice > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Estimated Profit:</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                +{currency}{' '}
                                {(
                                  (selectedProductForSale.sellingPrice - selectedProductForSale.costPrice) *
                                  saleQuantity
                                ).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sold at (Total Price) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Sold At (Total Price)
                      </label>
                      {selectedProductForSale && parseFloat(saleSoldPrice) !== selectedProductForSale.sellingPrice * saleQuantity && (
                        <button
                          type="button"
                          onClick={() => setSaleSoldPrice(String(selectedProductForSale.sellingPrice * saleQuantity))}
                          className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          ↺ Reset to {currency} {(selectedProductForSale.sellingPrice * saleQuantity).toLocaleString()}
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        id="input-sale-total-price"
                        type="number"
                        step="any"
                        min="0"
                        value={saleSoldPrice}
                        onChange={(e) => setSaleSoldPrice(e.target.value)}
                        placeholder="Sold at (Total Price)"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none pr-14"
                        required
                      />
                      <span className="absolute right-3 text-xs font-bold text-slate-400 pointer-events-none">
                        {currency}
                      </span>
                    </div>
                    {saleQuantity > 1 && parseFloat(saleSoldPrice) > 0 && (
                      <div className="text-[11px] text-slate-400 px-1">
                        Effective rate:{' '}
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {currency} {((parseFloat(saleSoldPrice) || 0) / saleQuantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>{' '}
                        per unit
                      </div>
                    )}
                  </div>

                  {/* + Add customer name */}
                  <div className="pt-0.5">
                    {!showAddCustomer ? (
                      <button
                        type="button"
                        onClick={() => setShowAddCustomer(true)}
                        className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        + Add customer name
                      </button>
                    ) : (
                      <div className="space-y-1 animate-fadeIn">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Customer Name
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Walk-in Client, Grace K."
                          className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    )}
                  </div>

                  {/* SOLD BUTTON */}
                  <button
                    id="btn-record-sold"
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-sky-600/30 active:scale-[0.99] transition"
                  >
                    SOLD
                  </button>
                </form>
              </div>
            )}

            {/* Other sections shown only after sales have been added */}
            {sales.length > 0 && (
              <>
                {/* Timeframe Filter Buttons: Today | This Week | This Month | This Year | All Time */}
            <div className="bg-white/10 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-white/20 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'year', label: 'This Year' },
                { id: 'all', label: 'All Time' },
              ].map((f) => {
                const active = saleDateFilter === f.id;
                return (
                  <button
                    key={f.id}
                    id={`btn-sale-filter-${f.id}`}
                    type="button"
                    onClick={() => setSaleDateFilter(f.id as any)}
                    className={`flex-1 min-w-[72px] py-2 px-2.5 rounded-xl font-bold text-xs text-center transition whitespace-nowrap ${
                      active
                        ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-md scale-[1.02]'
                        : 'text-white/80 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Sales Stats Summary Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-sky-100 dark:border-slate-800 flex items-center justify-around gap-2">
              <div className="text-center flex-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Sale
                </span>
                <span className="text-xs sm:text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                  {currency} {totalSalesAmountForPeriod.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

              <div className="text-center flex-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Items Sold
                </span>
                <span className="text-xs sm:text-sm font-extrabold font-mono text-sky-600 dark:text-sky-400">
                  {totalItemsSoldForPeriod} {totalItemsSoldForPeriod === 1 ? 'unit' : 'units'}
                </span>
              </div>
            </div>

            {/* Bottom Section: Dynamic Header • X sales (From Screenshot 2) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-white px-1">
                <span className="font-extrabold text-sm">
                  {saleDateFilter === 'today' && "Today's Sales"}
                  {saleDateFilter === 'week' && "This Week's Sales"}
                  {saleDateFilter === 'month' && "This Month's Sales"}
                  {saleDateFilter === 'year' && "This Year's Sales"}
                  {saleDateFilter === 'custom' && `Sales for ${new Date(saleCustomFilterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                  {saleDateFilter === 'all' && 'All Sales'} • {filteredSalesList.length} records
                </span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="date"
                      value={saleCustomFilterDate}
                      onChange={(e) => {
                        setSaleCustomFilterDate(e.target.value);
                        setSaleDateFilter('custom');
                      }}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                      title="Filter by specific date"
                    />
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition ${
                        saleDateFilter === 'custom'
                          ? 'bg-white text-sky-700 shadow-sm'
                          : 'bg-white/15 hover:bg-white/25 text-white'
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      <span>{saleDateFilter === 'custom' ? new Date(saleCustomFilterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Date'}</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaleSortOrder(saleSortOrder === 'latest' ? 'amount' : 'latest')}
                    className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 flex items-center gap-1 font-semibold transition"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Sort</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportReport('sales')}
                    className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 flex items-center gap-1 font-semibold transition text-white"
                    title="Export Sales Report (PDF)"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Filtered Sales List */}
              {filteredSalesList.length === 0 ? (
                <div className="bg-white/10 rounded-2xl p-6 text-center text-white/80 border border-white/15">
                  <p className="text-xs">
                    {saleDateFilter === 'today' && 'No sales recorded yet today.'}
                    {saleDateFilter === 'week' && 'No sales recorded this week.'}
                    {saleDateFilter === 'month' && 'No sales recorded this month.'}
                    {saleDateFilter === 'year' && 'No sales recorded this year.'}
                    {saleDateFilter === 'custom' && `No sales recorded on ${new Date(saleCustomFilterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.`}
                    {saleDateFilter === 'all' && 'No sales recorded yet.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSalesList.map((sale, index) => (
                    <React.Fragment key={sale.id}>
                      <div
                        className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-sm border border-sky-100 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                            {sale.itemId && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold">
                                ID: #{sale.itemId}
                              </span>
                            )}
                            <span>{sale.productName}</span>
                            {sale.categoryId && (() => {
                              const cat = productCategories.find((c) => c.id === sale.categoryId);
                              return cat ? (
                                <span
                                  className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                                  style={{
                                    backgroundColor: `${cat.color || '#0284c7'}18`,
                                    color: cat.color || '#0284c7',
                                  }}
                                >
                                  {cat.name}
                                </span>
                              ) : null;
                            })()}
                            {(sale as any).isStaffSale ? (
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-extrabold text-[10px] flex items-center gap-1">
                                <User className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                <span>Staff Sale ({(sale as any).workerName})</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-extrabold text-[10px]">
                                Qty: {sale.quantity} sold
                              </span>
                            )}
                            {sale.remainingStock !== undefined && (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[10px]">
                                Balance left: {sale.remainingStock}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {sale.customerName && <span>Client: <strong className="text-slate-600 dark:text-slate-300">{sale.customerName}</strong></span>}
                            {sale.customerName && sale.quantity > 1 && <span>•</span>}
                            {sale.quantity > 1 && <span>({currency} {sale.sellingPrice.toLocaleString()} each)</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="font-extrabold text-sm font-mono text-slate-900 dark:text-white">
                            {currency} {sale.totalPrice.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartEditSale(sale)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition rounded-lg"
                            title="Edit sale"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSale(sale.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition rounded-lg"
                            title="Delete sale"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {(index + 1) % 6 === 0 && (
                        <div key={`inline-admob-sale-${sale.id}`} className="py-1">
                          <AdMobNativeAd
                            context="inventory"
                            variant="in-feed"
                            unitId={ADMOB_UNITS.NATIVE_ADVANCED}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
              </>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION 3: STOCK TAB (Screenshot 3)                                  */}
        {/* ==================================================================== */}
        {currentCategory === 'products' && activeTab === 'stock' && (
          <div className="space-y-2 animate-fadeIn pb-6">
            {/* Inline Add Product Form */}
            {showAddProductInline && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2 px-1">
                  <h3 className="text-sm font-extrabold text-white">Add New Product</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddProductInline(false)}
                    className="text-xs font-bold text-sky-100 hover:underline"
                  >
                    Hide
                  </button>
                </div>
                {renderAddProductForm()}
              </div>
            )}

            {products.length === 0 ? (
              /* Show empty state message only if add form is closed */
              !showAddProductInline && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-white">
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
                    <LayoutGrid className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">No products yet</h3>
                  <p className="text-xs text-sky-100 mt-1">Tap to add your first product</p>
                  <button
                    type="button"
                    onClick={() => setShowAddProductInline(true)}
                    className="mt-5 px-6 py-3 rounded-2xl bg-white text-sky-700 font-extrabold text-xs shadow-lg hover:bg-sky-50 active:scale-95 transition"
                  >
                    + Add First Product
                  </button>
                </div>
              )
            ) : (
              /* Populated Stock Manager */
              <div className="space-y-2">
                {/* Stock Analytics Overview */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-sky-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Items Available</span>
                    <span className="text-lg font-black text-slate-800 dark:text-white">{stockAnalytics.totalItems}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-sky-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Stock Cost</span>
                    <span className="text-lg font-black text-sky-600 dark:text-sky-400">{currency} {stockAnalytics.totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Category Action Panel */}
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 rounded-xl px-2.5 py-2.5 shadow-xs border border-sky-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddProductInline(!showAddProductInline);
                        setShowProductCategoryForm(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition ${
                        showAddProductInline
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                          : 'bg-sky-600 hover:bg-sky-700 text-white'
                      }`}
                    >
                      {showAddProductInline ? (
                        <>
                          <X className="w-3.5 h-3.5" /> Close Form
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Add Product
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProductCategoryForm(!showProductCategoryForm);
                        setShowAddProductInline(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition ${
                        showProductCategoryForm
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {showProductCategoryForm ? (
                        <>
                          <X className="w-3.5 h-3.5" /> Close Form
                        </>
                      ) : (
                        <>
                          <Tag className="w-3.5 h-3.5" /> Create Category
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExportReport('stock')}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-sm transition bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700"
                    title="Export Stock Report (PDF)"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Export</span>
                  </button>
                </div>

                {/* Collapsible Create Product Category Form */}
                {showProductCategoryForm && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg border border-sky-100 dark:border-slate-800 animate-fadeIn space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                          <Tag className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                          Create Product Category
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowProductCategoryForm(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Category Name *
                          </label>
                          <input
                            type="text"
                            value={newProductCategoryName}
                            onChange={(e) => setNewProductCategoryName(e.target.value)}
                            placeholder="e.g. Shoes, Shirts, Electronics..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Color Tag
                          </label>
                          <div className="flex items-center gap-1.5 h-9">
                            {[
                              { color: '#3b82f6', name: 'Blue' },
                              { color: '#10b981', name: 'Emerald' },
                              { color: '#8b5cf6', name: 'Purple' },
                              { color: '#f59e0b', name: 'Amber' },
                              { color: '#ef4444', name: 'Red' },
                              { color: '#ec4899', name: 'Pink' },
                              { color: '#64748b', name: 'Slate' },
                            ].map((preset) => (
                              <button
                                key={preset.color}
                                type="button"
                                onClick={() => setNewProductCategoryColor(preset.color)}
                                className={`w-5 h-5 rounded-full transition-all ${
                                  newProductCategoryColor === preset.color
                                    ? 'ring-2 ring-offset-1 ring-sky-500 scale-110'
                                    : 'hover:scale-105'
                                }`}
                                style={{ backgroundColor: preset.color }}
                                title={preset.name}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1.5">
                        <button
                          type="button"
                          onClick={handleCreateProductCategory}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition"
                        >
                          Save Category
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowProductCategoryForm(false);
                            setNewProductCategoryName('');
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Product Category Filter Pills */}
                {productCategories.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 bg-slate-50/50 dark:bg-slate-900/30 px-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-sky-500" /> Category:
                    </span>
                    <button
                      type="button"
                      onClick={() => setProductCategoryFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 transition whitespace-nowrap ${
                        productCategoryFilter === 'all'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100'
                      }`}
                    >
                      <span>All Categories</span>
                      <span className="bg-slate-200/50 dark:bg-slate-700 px-1.5 rounded-full text-[9px]">
                        {products.length}
                      </span>
                    </button>

                    {productCategories.map((cat) => {
                      const count = products.filter((prod) => prod.categoryId === cat.id).length;
                      const isSelected = productCategoryFilter === cat.id;
                      return (
                        <div key={cat.id} className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setProductCategoryFilter(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 transition whitespace-nowrap ${
                              isSelected
                                ? 'text-white shadow-xs font-black'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100'
                            }`}
                            style={{
                              backgroundColor: isSelected ? cat.color || '#64748b' : undefined,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: isSelected ? '#ffffff' : cat.color || '#64748b' }}
                            />
                            <span>{cat.name}</span>
                            <span className={`px-1.5 rounded-full text-[9px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                              {count}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProductCategory(cat.id, cat.name);
                            }}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-500 transition"
                            title={`Delete category ${cat.name}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Search & Filter bar - Compact */}
                <div className="bg-white dark:bg-slate-900 rounded-xl px-2.5 py-2 shadow-xs border border-sky-100 dark:border-slate-800 space-y-1.5">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      placeholder="Search products by name or ID..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setStockFilter('all')}
                      className={`px-2 py-0.5 rounded-md font-bold transition shrink-0 ${
                        stockFilter === 'all'
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      All ({products.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFilter('in-stock')}
                      className={`px-2 py-0.5 rounded-md font-bold transition shrink-0 ${
                        stockFilter === 'in-stock'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      In Stock ({products.filter((p) => p.quantity > 0).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFilter('low')}
                      className={`px-2 py-0.5 rounded-md font-bold transition shrink-0 ${
                        stockFilter === 'low'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Low Stock ({stats.lowStockCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFilter('out')}
                      className={`px-2 py-0.5 rounded-md font-bold transition shrink-0 ${
                        stockFilter === 'out'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Out ({stats.outOfStockCount})
                    </button>
                  </div>
                </div>

                {/* Compact Products List Items (fits ~5 items on mobile without scrolling) */}
                <div className="space-y-1.5">
                  {filteredProducts.map((prod, index) => {
                    const isOutOfStock = prod.quantity === 0;
                    const isLowStock = prod.quantity > 0 && prod.quantity < 5;
                    const catObj = productCategories.find((c) => c.id === prod.categoryId);

                    return (
                      <React.Fragment key={prod.id}>
                        <div
                          className="bg-white dark:bg-slate-900 rounded-xl px-2.5 py-2 shadow-xs border border-sky-100 dark:border-slate-800 transition hover:border-sky-300"
                        >
                        {/* Top Row: Thumbnail + Item info + Stock Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 font-mono font-extrabold text-[11px] shrink-0">
                                #{prod.itemId}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              {/* Row 1: #ID + Product Name + Size tags */}
                              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono font-bold shrink-0">
                                  #{prod.itemId}
                                </span>
                                {catObj && (
                                  <span
                                    className="text-[9px] font-black px-1.5 py-0.2 rounded text-white shrink-0"
                                    style={{ backgroundColor: catObj.color || '#64748b' }}
                                  >
                                    {catObj.name}
                                  </span>
                                )}
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {prod.name}
                                </h4>
                                {prod.sizes && prod.sizes.length > 0 && (
                                  <span className="text-[9px] text-slate-400 font-medium shrink-0 truncate max-w-[65px]">
                                    ({prod.sizes.join(',')})
                                  </span>
                                )}
                              </div>

                              {/* Row 2: Price details in one compact line */}
                              <div className="flex items-center gap-2 text-[10.5px] mt-0.5 flex-wrap">
                                <span className="font-extrabold text-sky-600 dark:text-sky-400 font-mono">
                                  {currency} {prod.sellingPrice.toLocaleString()}
                                </span>
                                <span className="text-slate-400 text-[9.5px]">
                                  Cost: {prod.costPrice.toLocaleString()}
                                </span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[9.5px]">
                                  +{(prod.sellingPrice - prod.costPrice).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Stock Status Badge */}
                          <div className="shrink-0 text-right">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block ${
                                isOutOfStock
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                  : isLowStock
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {prod.quantity} in stock
                            </span>
                          </div>
                        </div>

                        {/* Bottom Row: Quick Actions Bar */}
                        <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setRestockModalProduct(prod);
                                setRestockQtyInput(5);
                              }}
                              className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-bold transition flex items-center gap-1 text-[10px]"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Restock</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSellModalProduct(prod);
                                setSellQtyInput(1);
                              }}
                              disabled={prod.quantity <= 0}
                              className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold transition flex items-center gap-1 text-[10px] disabled:opacity-40"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              <span>Sell</span>
                            </button>

                            {/* Create Receipt or Invoice with this item */}
                            {onCreateReceiptWithItem && (
                              <button
                                type="button"
                                onClick={() => onCreateReceiptWithItem({ name: prod.name, unitPrice: prod.sellingPrice, quantity: 1 })}
                                className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                                title="Create receipt with this product"
                              >
                                <ReceiptIcon className="w-3 h-3" />
                              </button>
                            )}

                            {onCreateInvoiceWithItem && (
                              <button
                                type="button"
                                onClick={() => onCreateInvoiceWithItem({ name: prod.name, unitPrice: prod.sellingPrice, quantity: 1 })}
                                className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                                title="Create invoice with this product"
                              >
                                <FileText className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => startEditProduct(prod)}
                              className="p-1 text-slate-400 hover:text-sky-600 transition rounded"
                              title="Edit product"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="p-1 text-slate-400 hover:text-rose-500 transition rounded"
                              title="Delete product"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {(index + 1) % 6 === 0 && (
                        <div key={`inline-admob-prod-${prod.id}`} className="py-1">
                          <AdMobNativeAd
                            context="inventory"
                            variant="in-feed"
                            unitId={ADMOB_UNITS.NATIVE_ADVANCED}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION 4: EXPENSES TAB                                              */}
        {/* ==================================================================== */}
        {currentCategory === 'money' && activeTab === 'expense' && (
          <div className="space-y-3 animate-fadeIn pb-6">
            {/* Top of Expenses Page: Add Expense Button */}
            <button
              id="btn-add-expense"
              type="button"
              onClick={() => setShowExpenseForm((prev) => !prev)}
              className={`w-full py-3 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99] ${
                showExpenseForm
                  ? 'bg-white/20 dark:bg-slate-800 text-white border border-white/30 hover:bg-white/30'
                  : 'bg-white text-[#0284c7] hover:bg-sky-50 shadow-sky-900/10'
              }`}
            >
              {showExpenseForm ? (
                <>
                  <X className="w-4 h-4" /> Close Expense Form
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-[#0284c7]" /> Add expense
                </>
              )}
            </button>

            {/* Collapsible Expense Form Card (Shown when Add expense is clicked) */}
            {showExpenseForm && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xl border border-sky-100 dark:border-slate-800 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      Record Expense
                    </h3>
                    <p className="text-[11px] text-slate-400">Log shop rent, utilities, transport, restock, or operating costs.</p>
                  </div>

                  {/* Date Picker Pill */}
                  <div className="relative">
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    />
                    <div className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-sky-600" />
                      <span>{new Date(expenseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                </div>

                <form onSubmit={handleRecordExpense} className="space-y-3.5">
                  {/* Expense Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Expense Title
                    </label>
                    <input
                      type="text"
                      value={expenseTitle}
                      onChange={(e) => setExpenseTitle(e.target.value)}
                      placeholder="e.g. Shop Rent, Stock Transport, Electricity"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Amount */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Amount ({currency})
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none pr-14"
                        required
                      />
                      <span className="absolute right-3 text-xs font-bold text-slate-400 pointer-events-none">
                        {currency}
                      </span>
                    </div>
                  </div>

                  {/* Optional Notes */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={expenseNotes}
                      onChange={(e) => setExpenseNotes(e.target.value)}
                      placeholder="Additional details, invoice / receipt ref..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-sky-600/30 active:scale-[0.99] transition"
                  >
                    RECORD EXPENSE
                  </button>
                </form>
              </div>
            )}

            {/* Other sections shown only after expenses have been added */}
            {expenses.length > 0 && (
              <>
                {/* Top Summary Banner for Expenses */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-lg border border-sky-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">
                      {expenseFilter === 'today' && "Today's Expenses"}
                      {expenseFilter === 'week' && "This Week's Expenses"}
                      {expenseFilter === 'month' && "This Month's Expenses"}
                      {expenseFilter === 'year' && "This Year's Expenses"}
                      {expenseFilter === 'all' && 'Total Expenses (All Time)'}
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
                      {currency} {filteredExpensesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-4 sm:pl-6">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">ENTRIES</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                        {filteredExpenses.length} recorded
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeframe Filter Buttons: Today | This Week | This Month | This Year | All Time */}
                <div className="bg-white/10 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-white/20 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'This Week' },
                    { id: 'month', label: 'This Month' },
                    { id: 'year', label: 'This Year' },
                    { id: 'all', label: 'All Time' },
                  ].map((f) => {
                    const active = expenseFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        id={`btn-expense-filter-${f.id}`}
                        type="button"
                        onClick={() => setExpenseFilter(f.id as any)}
                        className={`flex-1 min-w-[72px] py-2 px-2.5 rounded-xl font-bold text-xs text-center transition whitespace-nowrap ${
                          active
                            ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-md scale-[1.02]'
                            : 'text-white/80 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>

                {/* Expenses History List */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-white px-1">
                    <span className="font-extrabold text-sm">
                      {expenseFilter === 'today' && "Today's Expenses"}
                      {expenseFilter === 'week' && "This Week's Expenses"}
                      {expenseFilter === 'month' && "This Month's Expenses"}
                      {expenseFilter === 'year' && "This Year's Expenses"}
                      {expenseFilter === 'all' && 'All Expenses'} • {filteredExpenses.length} records
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs bg-white/15 px-2.5 py-1 rounded-lg">
                        Total: {currency} {filteredExpensesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleExportReport('expense')}
                        className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 flex items-center gap-1 font-semibold transition text-white"
                        title="Export Expenses Report (PDF)"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </button>
                    </div>
                  </div>

                  {filteredExpenses.length === 0 ? (
                    <div className="bg-white/10 rounded-2xl p-6 text-center text-white/80 border border-white/15">
                      <p className="text-xs">
                        {expenseFilter === 'all'
                          ? 'No expenses recorded yet. Click "+ Add expense" above to log business expenditures.'
                          : `No expenses found for ${
                              expenseFilter === 'today'
                                ? 'today'
                                : expenseFilter === 'week'
                                ? 'this week'
                                : expenseFilter === 'month'
                                ? 'this month'
                                : 'this year'
                            }.`}
                      </p>
                      {expenseFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setExpenseFilter('all')}
                          className="mt-2 text-xs font-bold text-white underline hover:text-sky-200 transition"
                        >
                          Show all time expenses
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredExpenses.map((exp, index) => (
                        <React.Fragment key={exp.id}>
                          <div
                            className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-sm border border-sky-100 dark:border-slate-800 flex items-center justify-between"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                <span>{exp.title}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span>{new Date(exp.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                {exp.notes && (
                                  <span>• <span className="text-slate-500 italic">{exp.notes}</span></span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-extrabold text-sm font-mono text-rose-600 dark:text-rose-400">
                                - {currency} {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(exp.id, exp.title)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition rounded-lg"
                                title="Delete expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {(index + 1) % 6 === 0 && (
                            <div key={`inline-admob-exp-${exp.id}`} className="py-1">
                              <AdMobNativeAd
                                context="inventory"
                                variant="in-feed"
                                unitId={ADMOB_UNITS.NATIVE_ADVANCED}
                              />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION 5: DEBTS & DEMANDS TAB                                       */}
        {/* ==================================================================== */}
        {currentCategory === 'money' && activeTab === 'debts' && (
          <div className="space-y-3 animate-fadeIn">
            {/* Top of Debts Page: Add new debt Button */}
            <button
              id="btn-add-debt"
              type="button"
              onClick={() => {
                if (showDebtForm || editingDebtId) {
                  cancelEditDebt();
                } else {
                  setShowDebtForm(true);
                }
              }}
              className={`w-full py-3 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99] ${
                showDebtForm || editingDebtId
                  ? 'bg-white/20 dark:bg-slate-800 text-white border border-white/30 hover:bg-white/30'
                  : 'bg-white text-[#0284c7] hover:bg-sky-50 shadow-sky-900/10'
              }`}
            >
              {showDebtForm || editingDebtId ? (
                <>
                  <X className="w-4 h-4" /> Close Debt Form
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-[#0284c7]" /> Add new debt
                </>
              )}
            </button>

            {/* Collapsible Record / Edit Debt Form Card (Shown when Add new debt is clicked) */}
            {(showDebtForm || editingDebtId) && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-lg border border-sky-100 dark:border-slate-800 animate-fadeIn">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center font-bold">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {editingDebtId ? 'Edit Debt Record' : 'Record Debt / Person Demanded'}
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Record person who took items on credit / owes balance
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={cancelEditDebt}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveDebt} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* 1. Debtor / Customer Name */}
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                        Customer Name (Person Demanded) *
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={debtCustomerName}
                          onChange={(e) => setDebtCustomerName(e.target.value)}
                          placeholder="e.g. John Mukasa"
                          className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1.5 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    {/* 2. Phone Number */}
                    <div>
                      <PhoneInputField
                        id="input-debt-phone"
                        label={<span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Phone Number</span>}
                        value={debtPhone}
                        onChange={(val) => setDebtPhone(val)}
                        placeholder="700 123 456"
                        compact
                      />
                    </div>
                  </div>

                  {/* 3. Product Taken */}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Product Taken *
                      </label>
                      <button
                        id="btn-debt-pick-stock"
                        type="button"
                        onClick={() => {
                          if (products.length === 0) {
                            showToast('No products in stock yet. Please add products in the Stock tab first.');
                          } else {
                            setDebtStockSearchQuery('');
                            setDebtStockPickerOpen(true);
                          }
                        }}
                        className="text-[10px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 flex items-center gap-1 transition py-0.5 px-2 rounded-lg bg-sky-50 dark:bg-slate-800 border border-sky-100 dark:border-slate-700 hover:bg-sky-100"
                      >
                        <Package className="w-3 h-3" />
                        <span>Pick from stock</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Package className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={debtProductTaken}
                        onChange={(e) => setDebtProductTaken(e.target.value)}
                        placeholder="Type product name or click 'Pick from stock'"
                        className="w-full pl-8 pr-24 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1.5 focus:ring-sky-500"
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                        {products.length > 0 ? (
                          <select
                            aria-label="Quick pick product from stock"
                            value=""
                            onChange={(e) => {
                              const found = products.find((p) => p.id === e.target.value);
                              if (found) {
                                setDebtProductTaken(found.name);
                                setDebtAmount(String(found.sellingPrice || ''));
                                if (found.categoryId) {
                                  setDebtCategoryId(found.categoryId);
                                }
                              }
                            }}
                            className="text-[10px] font-bold py-1 px-1.5 rounded-md bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-slate-600 cursor-pointer focus:outline-none"
                          >
                            <option value="">Stock ▾</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (#{p.itemId}) - {currency} {p.sellingPrice}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              showToast('No products in stock yet. Please add products in the Stock tab first.');
                            }}
                            className="text-[10px] font-bold py-0.5 px-1.5 rounded-md bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600"
                          >
                            Stock ▾
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category (Optional) */}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Category
                      </label>
                      {debtCategoryId && (
                        <button
                          type="button"
                          onClick={() => setDebtCategoryId('')}
                          className="text-[10px] text-rose-500 hover:underline"
                        >
                          Clear Category
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <select
                        id="select-debt-category"
                        aria-label="Debt Category"
                        value={debtCategoryId}
                        onChange={(e) => setDebtCategoryId(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs focus:ring-1.5 focus:ring-sky-500 focus:outline-none"
                      >
                        <option value="">No Category / General</option>
                        {productCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <button
                        id="btn-new-debt-category"
                        type="button"
                        onClick={() => setShowDebtCategoryInput(!showDebtCategoryInput)}
                        className="px-2.5 py-1.5 bg-sky-50 dark:bg-slate-800 border border-sky-100 dark:border-slate-700 text-sky-600 dark:text-sky-400 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition active:scale-95 shrink-0"
                        title="Create new category"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="text-[11px]">New</span>
                      </button>
                    </div>

                    {/* Inline Quick Category Creation for Debt Form */}
                    {showDebtCategoryInput && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 animate-fadeIn">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Create New Category
                        </span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={debtQuickCategoryName}
                            onChange={(e) => setDebtQuickCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateDebtQuickCategory();
                              }
                            }}
                            placeholder="e.g. Groceries, Shoes, Electronics..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1.5 focus:ring-sky-500"
                          />
                          <button
                            type="button"
                            onClick={handleCreateDebtQuickCategory}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition shadow-xs"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* 4. Amount Demanded */}
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                        Amount ({currency}) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={debtAmount}
                        onChange={(e) => setDebtAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:ring-1.5 focus:ring-sky-500"
                      />
                    </div>

                    {/* 5. Date Taken */}
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                        Date Taken
                      </label>
                      <input
                        type="date"
                        value={debtDate}
                        onChange={(e) => setDebtDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1.5 focus:ring-sky-500"
                      />
                    </div>

                    {/* 6. Due Date */}
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                        Due Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={debtDueDate}
                        onChange={(e) => setDebtDueDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1.5 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* 7. Description / Notes */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                      Notes / Agreement
                    </label>
                    <input
                      type="text"
                      value={debtDescription}
                      onChange={(e) => setDebtDescription(e.target.value)}
                      placeholder="e.g. Promised to pay by 15th via Mobile Money"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1.5 focus:ring-sky-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-xs uppercase tracking-wider shadow-md active:scale-[0.99] transition"
                  >
                    {editingDebtId ? 'UPDATE DEBT RECORD' : 'SAVE DEBT / DEMAND'}
                  </button>
                </form>
              </div>
            )}

            {/* Other sections shown only after debts have been added */}
            {debts.length > 0 && (
              <>
                {/* Timeframe Filter Buttons: Today | This Week | This Month | This Year | All Time */}
                <div className="bg-white/10 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-white/20 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'This Week' },
                    { id: 'month', label: 'This Month' },
                    { id: 'year', label: 'This Year' },
                    { id: 'all', label: 'All Time' },
                  ].map((f) => {
                    const active = debtTimeFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        id={`btn-debt-filter-${f.id}`}
                        type="button"
                        onClick={() => setDebtTimeFilter(f.id as any)}
                        className={`flex-1 min-w-[72px] py-2 px-2.5 rounded-xl font-bold text-xs text-center transition whitespace-nowrap ${
                          active
                            ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-md scale-[1.02]'
                            : 'text-white/80 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>

            {/* Dashboard: Total Demanded & Total Paid in Debts */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-sky-100 dark:border-slate-800 flex items-center justify-around gap-2">
              <div className="text-center flex-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Demanded
                </span>
                <span className="text-xs sm:text-sm font-extrabold font-mono text-rose-600 dark:text-rose-400">
                  {currency} {totalOutstandingDebts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

              <div className="text-center flex-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Paid
                </span>
                <span className="text-xs sm:text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  {currency} {totalRecoveredDebts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>



            {/* Debts & Demands History List Section */}
            <div className="space-y-2 pt-1">
              {/* Dynamic Header with Specific Date Filter Button (as in Sales) */}
              <div className="flex items-center justify-between text-xs text-white px-1">
                <span className="font-extrabold text-sm">
                  {debtTimeFilter === 'today' && "Today's Debts"}
                  {debtTimeFilter === 'week' && "This Week's Debts"}
                  {debtTimeFilter === 'month' && "This Month's Debts"}
                  {debtTimeFilter === 'year' && "This Year's Debts"}
                  {debtTimeFilter === 'custom' && `Debts for ${new Date(debtCustomFilterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                  {debtTimeFilter === 'all' && 'All Debts'} • {timeFilteredDebts.length} records
                </span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="date"
                      value={debtCustomFilterDate}
                      onChange={(e) => {
                        setDebtCustomFilterDate(e.target.value);
                        setDebtTimeFilter('custom');
                      }}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                      title="Filter by specific date"
                    />
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition ${
                        debtTimeFilter === 'custom'
                          ? 'bg-white text-sky-700 shadow-sm'
                          : 'bg-white/15 hover:bg-white/25 text-white'
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      <span>{debtTimeFilter === 'custom' ? new Date(debtCustomFilterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Date'}</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportReport('debts')}
                    className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 flex items-center gap-1 font-semibold transition text-white"
                    title="Export Debts Report (PDF)"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Filter Pills & Compact Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setDebtStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                      debtStatusFilter === 'all'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    All ({timeFilteredDebts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebtStatusFilter('unpaid')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                      debtStatusFilter === 'unpaid'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Demanding ({unpaidDebtsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebtStatusFilter('paid')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                      debtStatusFilter === 'paid'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Settled ({timeFilteredDebts.length - unpaidDebtsCount})
                  </button>
                </div>

                <div className="relative min-w-[150px]">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={debtSearchQuery}
                    onChange={(e) => setDebtSearchQuery(e.target.value)}
                    placeholder="Search debtor, item..."
                    className="w-full pl-7 pr-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  {debtSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDebtSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* High-Density Compact Debt Cards: Fits 5+ records on screen before scrolling */}
              {filteredDebts.length === 0 ? (
                <div className="bg-white/10 dark:bg-slate-900/50 rounded-2xl p-5 text-center text-white/90 border border-white/15 dark:border-slate-800">
                  <p className="text-xs font-medium">
                    {debtTimeFilter === 'all'
                      ? debtSearchQuery
                        ? 'No debt records match your search.'
                        : debtStatusFilter === 'unpaid'
                        ? 'No outstanding debts! All records are cleared.'
                        : debtStatusFilter === 'paid'
                        ? 'No settled debt records found.'
                        : 'No debt records logged yet. Click "+ Add new debt" above to add people owing money.'
                      : debtTimeFilter === 'custom'
                      ? `No debt records found for ${new Date(debtCustomFilterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.`
                      : `No debt records found for ${
                          debtTimeFilter === 'today'
                            ? 'today'
                            : debtTimeFilter === 'week'
                            ? 'this week'
                            : debtTimeFilter === 'month'
                            ? 'this month'
                            : 'this year'
                        }.`}
                  </p>
                  {debtTimeFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setDebtTimeFilter('all')}
                      className="mt-2 text-xs font-bold text-white underline hover:text-sky-200 transition"
                    >
                      View all time records
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredDebts.map((debt, index) => {
                    const isPaid = debt.status === 'paid';
                    const isOverdue =
                      !isPaid &&
                      debt.dueDate &&
                      new Date(debt.dueDate) < new Date(new Date().toISOString().split('T')[0]);

                    return (
                      <React.Fragment key={debt.id}>
                        <div
                          className={`bg-white dark:bg-slate-900 rounded-xl px-3 py-2 sm:py-2.5 shadow-xs border transition hover:shadow-sm ${
                          isPaid
                            ? 'border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/20'
                            : isOverdue
                            ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {/* Line 1: Debtor Name + Status Badge + Amount */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                              {debt.customerName}
                            </span>

                            {isPaid ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded shrink-0">
                                <Check className="w-2.5 h-2.5" /> PAID
                              </span>
                            ) : debt.status === 'partial' || (debt.paidAmount && debt.paidAmount > 0) ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded shrink-0">
                                <PieChart className="w-2.5 h-2.5" /> PARTIAL
                              </span>
                            ) : isOverdue ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 rounded shrink-0">
                                <AlertTriangle className="w-2.5 h-2.5" /> OVERDUE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded shrink-0">
                                <Clock className="w-2.5 h-2.5" /> DEMANDING
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amounts Grid */}
                        <div className={`grid gap-2 mt-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg p-2 border border-slate-100 dark:border-slate-800 ${
                          (!isPaid && (debt.paidAmount || 0) > 0) ? 'grid-cols-3' : isPaid ? 'grid-cols-2' : 'grid-cols-1'
                        }`}>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                              {(!isPaid && (debt.paidAmount || 0) === 0) ? 'Demanding' : 'Total Demanded'}
                            </span>
                            <span className={`text-[11px] sm:text-xs font-mono font-bold ${(!isPaid && (debt.paidAmount || 0) === 0) ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {currency} {debt.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          
                          {(!isPaid && (debt.paidAmount || 0) > 0) && (
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Already Paid</span>
                              <span className="text-[11px] sm:text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {currency} {(debt.paidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          {(isPaid || (!isPaid && (debt.paidAmount || 0) > 0)) && (
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">
                                {isPaid ? 'Fully Paid' : 'Debt Balance'}
                              </span>
                              <span className={`text-[11px] sm:text-xs font-mono font-bold ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {currency} {isPaid ? debt.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : Math.max(0, debt.amount - (debt.paidAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedDebts(prev => ({...prev, [debt.id]: !prev[debt.id]}))}
                          className="w-full mt-2 py-1 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-800/20 dark:hover:bg-slate-800/50 rounded-md border border-slate-100 dark:border-slate-800/50"
                        >
                          {expandedDebts[debt.id] ? (
                            <>See Less <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>See More <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>

                        {expandedDebts[debt.id] && (
                          <div className="animate-fadeIn">
                            {/* Line 2: Product Taken • Phone • Date/Due • Note preview & Action buttons */}
                            <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                              <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 truncate max-w-[140px] sm:max-w-[200px]">
                                  <Package className="w-3 h-3 text-sky-600 shrink-0" />
                                  <span className="truncate">{debt.productTaken}</span>
                                </span>

                                {debt.categoryId && (() => {
                                  const cat = productCategories.find((c) => c.id === debt.categoryId);
                                  return cat ? (
                                    <span
                                      className="px-1.5 py-0.5 rounded-md text-[9px] font-bold shrink-0"
                                      style={{
                                        backgroundColor: `${cat.color || '#0284c7'}18`,
                                        color: cat.color || '#0284c7',
                                      }}
                                    >
                                      {cat.name}
                                    </span>
                                  ) : null;
                                })()}

                                {debt.phone && (
                                  <a
                                    href={`tel:${debt.phone}`}
                                    className="flex items-center gap-0.5 text-sky-600 dark:text-sky-400 hover:underline shrink-0 font-medium"
                                  >
                                    <Phone className="w-2.5 h-2.5" />
                                    <span>{debt.phone}</span>
                                  </a>
                                )}

                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {debt.dueDate ? (
                                    <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                                      Due {new Date(debt.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </span>
                                  ) : (
                                    <span>{new Date(debt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                  )}
                                </span>
                              </div>

                              {/* Compact Action Buttons */}
                              <div className="flex items-center gap-1 shrink-0 ml-auto pt-0.5 sm:pt-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDebtStatus(debt)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition ${
                                    isPaid
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  }`}
                                  title={isPaid ? 'Mark as Unpaid' : 'Mark as Settled / Paid'}
                                >
                                  <Check className="w-2.5 h-2.5" />
                                  {isPaid ? 'Unpay' : 'Settle'}
                                </button>

                                {debt.status === 'partial' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      showConfirm(
                                        'Reset Partial Payments',
                                        'Are you sure you want to clear all partial payments and mark as unpaid?',
                                        () => {
                                          StorageService.updateInventoryDebt(debt.id, {
                                            status: 'unpaid',
                                            paidAmount: 0,
                                            payments: []
                                          });
                                          refreshData();
                                          showToast('Partial payments reset.');
                                        }
                                      );
                                    }}
                                    className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition"
                                    title="Reset all payments"
                                  >
                                    Reset
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleSendDebtReminderWhatsApp(debt)}
                                  className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5 transition"
                                  title="Send WhatsApp Reminder"
                                >
                                  <MessageCircle className="w-3 h-3 text-emerald-600" />
                                  <span className="hidden xs:inline">WhatsApp</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => startEditDebt(debt)}
                                  className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title="Edit record"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteDebt(debt.id, debt.customerName)}
                                  className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                  title="Delete record"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Always-visible Notes / Description box */}
                            {Boolean(debt.description?.trim()) && (
                              <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-200 bg-amber-50/80 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40 w-full">
                                <span className="font-extrabold text-amber-700 dark:text-amber-400 text-[10px] uppercase tracking-wider shrink-0 mt-[1px]">
                                  Note:
                                </span>
                                <span className="italic leading-snug break-words flex-1 text-[11px]">
                                  "{debt.description}"
                                </span>
                              </div>
                            )}

                            {/* Payment History */}
                            {debt.payments && debt.payments.length > 0 && (
                              <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-1">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Payment History ({debt.payments.length})
                                </div>
                                <div className="space-y-0.5">
                                  {debt.payments.map((payment, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[10px] bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded">
                                      <span className="text-slate-500 dark:text-slate-400">
                                        {new Date(payment.date).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                        + {currency} {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {(index + 1) % 6 === 0 && (
                        <div key={`inline-admob-debt-${debt.id}`} className="py-1">
                          <AdMobNativeAd
                            context="inventory"
                            variant="in-feed"
                            unitId={ADMOB_UNITS.NATIVE_ADVANCED}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
                </div>
              )}
            </div>
              </>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION 7: SHOPPING LIST TAB                                         */}
        {/* ==================================================================== */}
        {currentCategory === 'products' && activeTab === 'shoppingList' && (
          <div id="shopping-list-main-card" className="space-y-3 animate-fadeIn bg-white dark:bg-slate-900 p-2 rounded-2xl">
            {/* Header Title */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl px-4 py-3 shadow-xs border border-sky-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Shopping List
                  </h3>
                  <p className="text-[10px] font-medium text-slate-400">
                    Plan and track items to buy for your business
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveShoppingListPhoto}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center gap-1 transition border border-emerald-100 dark:border-emerald-800 shadow-2xs"
                  title="Save Shopping List as Photo"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Save Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportReport('shoppingList')}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-extrabold text-xs flex items-center gap-1.5 transition border border-sky-100 dark:border-sky-800 shadow-2xs"
                  title="Export Shopping List (PDF)"
                >
                  <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            {/* If no items have been added yet, show only the Add Shopping Item button */}
            {shoppingList.length === 0 && (
              <button
                id="btn-add-shopping-item-empty"
                type="button"
                onClick={() => {
                  setShowCategoryForm(false);
                  if (showShoppingForm) {
                    cancelEditShoppingItem();
                  } else {
                    setShowShoppingForm(true);
                  }
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {showShoppingForm ? (
                  <>
                    <X className="w-4 h-4" /> Close Form
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Add shopping item
                  </>
                )}
              </button>
            )}

            {/* Other sections shown only after shopping list items have been added */}
            {shoppingList.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-sky-100 dark:border-slate-800">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="border-r border-slate-100 dark:border-slate-800 pr-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Budget
                    </span>
                    <span className="text-sm font-extrabold font-mono text-sky-600 dark:text-sky-400 block mt-0.5">
                      {currency} {shoppingBudgetSummary.totalEstimated.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="border-r border-slate-100 dark:border-slate-800 px-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Completed
                    </span>
                    <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 block mt-0.5">
                      {currency} {shoppingBudgetSummary.checkedEstimated.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pl-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      To Buy
                    </span>
                    <span className="text-sm font-extrabold font-mono text-amber-500 block mt-0.5">
                      {shoppingList.filter((item) => !item.checked).length} items
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                {shoppingList.length > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1">
                      <span>Shopping Progress</span>
                      <span>
                        {Math.round(
                          (shoppingList.filter((i) => i.checked).length / shoppingList.length) * 100
                        )}
                        % Completed
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            (shoppingList.filter((i) => i.checked).length / shoppingList.length) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Toggle Form and Clear List Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryForm(false);
                        if (showShoppingForm) {
                          cancelEditShoppingItem();
                        } else {
                          setShowShoppingForm(true);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition ${
                        showShoppingForm
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                          : 'bg-[#0284c7] hover:bg-[#0369a1] text-white'
                      }`}
                    >
                      {showShoppingForm ? (
                        <>
                          <X className="w-3.5 h-3.5" /> Close Form
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Add Shopping Item
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        cancelEditShoppingItem();
                        setShowShoppingForm(false);
                        setShowCategoryForm(!showCategoryForm);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition ${
                        showCategoryForm
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {showCategoryForm ? (
                        <>
                          <X className="w-3.5 h-3.5" /> Close Category
                        </>
                      ) : (
                        <>
                          <Tag className="w-3.5 h-3.5" /> Create Category
                        </>
                      )}
                    </button>
                  </div>

                  {shoppingList.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {shoppingList.some((i) => i.checked) && (
                        <button
                          type="button"
                          onClick={handleClearCheckedShoppingItems}
                          className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition border border-amber-200 dark:border-amber-900/50"
                          title="Clear completed items"
                        >
                          Clear Checked
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleClearAllShoppingItems}
                        className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition border border-rose-200 dark:border-rose-900/50"
                        title="Clear whole list"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Collapsible Create Category Form */}
            {showCategoryForm && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg border border-sky-100 dark:border-slate-800 animate-fadeIn space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                      <Tag className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Create Category
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCategoryForm(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g. Groceries, Drinks, Clothes..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Color Tag
                      </label>
                      <div className="flex items-center gap-1.5 h-9">
                        {[
                          { color: '#64748b', name: 'Slate' },
                          { color: '#10b981', name: 'Emerald' },
                          { color: '#3b82f6', name: 'Blue' },
                          { color: '#8b5cf6', name: 'Purple' },
                          { color: '#f59e0b', name: 'Amber' },
                          { color: '#ef4444', name: 'Red' },
                          { color: '#ec4899', name: 'Pink' },
                        ].map((preset) => (
                          <button
                            key={preset.color}
                            type="button"
                            onClick={() => setNewCategoryColor(preset.color)}
                            className={`w-5 h-5 rounded-full transition-all ${
                              newCategoryColor === preset.color
                                ? 'ring-2 ring-offset-1 ring-sky-500 scale-110'
                                : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: preset.color }}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleCreateCategory({ preventDefault: () => {} } as any);
                        setShowCategoryForm(false);
                      }}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition"
                    >
                      Save Category
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryForm(false);
                        setNewCategoryName('');
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Collapsible Add/Edit Form */}
            {showShoppingForm && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg border border-sky-100 dark:border-slate-800 animate-fadeIn">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center font-bold">
                      <ListTodo className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      {editingShoppingId ? 'Edit Shopping Item' : 'Add Shopping Item'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={cancelEditShoppingItem}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveShoppingItem} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        list="inventory-products-suggestions"
                        value={shoppingItemName}
                        onChange={(e) => setShoppingItemName(e.target.value)}
                        placeholder="Type item name to buy..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                        required
                      />
                      <datalist id="inventory-products-suggestions">
                        {products.map((p) => (
                          <option key={p.id} value={p.name} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Quantity / Unit *
                      </label>
                      <input
                        type="text"
                        value={shoppingItemQty}
                        onChange={(e) => setShoppingItemQty(e.target.value)}
                        placeholder="e.g. 5, 10kg, 2 boxes"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Est. Unit Price ({currency})
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={shoppingItemEstPrice}
                        onChange={(e) => setShoppingItemEstPrice(e.target.value)}
                        placeholder="Optional estimated cost per unit"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Notes / Brand
                      </label>
                      <input
                        type="text"
                        value={shoppingItemNotes}
                        onChange={(e) => setShoppingItemNotes(e.target.value)}
                        placeholder="e.g. Super Basmati, Blue band"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Category
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowNewCategoryInline(!showNewCategoryInline)}
                          className="text-[10px] text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-bold flex items-center gap-0.5"
                        >
                          {showNewCategoryInline ? '✕ Close' : '+ New Category'}
                        </button>
                      </div>
                      <select
                        value={shoppingItemCategoryId}
                        onChange={(e) => setShoppingItemCategoryId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">No Category</option>
                        {shoppingCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {showNewCategoryInline && (
                    <div className="p-3 rounded-xl bg-sky-50/50 dark:bg-slate-800/40 border border-sky-100/60 dark:border-slate-700 space-y-2.5 animate-fadeIn">
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider block">
                        Create New Category
                      </span>
                      <div className="flex flex-col sm:flex-row gap-2.5 items-end">
                        <div className="flex-1 w-full">
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g., Groceries, Drinks, Spices..."
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 self-center sm:self-end">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Color Tag:</span>
                          <div className="flex items-center gap-1.5">
                            {[
                              { color: '#64748b', name: 'Slate' },
                              { color: '#10b981', name: 'Emerald' },
                              { color: '#3b82f6', name: 'Blue' },
                              { color: '#8b5cf6', name: 'Purple' },
                              { color: '#f59e0b', name: 'Amber' },
                              { color: '#ef4444', name: 'Red' },
                              { color: '#ec4899', name: 'Pink' },
                            ].map((preset) => (
                              <button
                                key={preset.color}
                                type="button"
                                onClick={() => setNewCategoryColor(preset.color)}
                                className={`w-4 h-4 rounded-full transition-all ${
                                  newCategoryColor === preset.color
                                    ? 'ring-2 ring-offset-1 ring-sky-500 scale-110'
                                    : 'hover:scale-105'
                                }`}
                                style={{ backgroundColor: preset.color }}
                                title={preset.name}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1.5 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={handleCreateCategory}
                            className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-black uppercase tracking-wider"
                          >
                            Save Category
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1.5">
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition"
                    >
                      {editingShoppingId ? 'Update Item' : 'Add To List'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditShoppingItem}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List & Filtering Section (Shown only after items have been added) */}
            {shoppingList.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setShoppingFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                        shoppingFilter === 'all'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      All ({shoppingList.filter((i) => !i.hidden).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setShoppingFilter('unchecked')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                        shoppingFilter === 'unchecked'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      To Buy ({shoppingList.filter((i) => !i.checked && !i.hidden).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setShoppingFilter('checked')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                        shoppingFilter === 'checked'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Completed ({shoppingList.filter((i) => i.checked && !i.hidden).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setShoppingFilter('hidden')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                        shoppingFilter === 'hidden'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Hidden ({shoppingList.filter((i) => i.hidden).length})
                    </button>
                  </div>

                  {/* Compact Search Bar */}
                  <div className="relative min-w-[150px]">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={shoppingSearchQuery}
                      onChange={(e) => setShoppingSearchQuery(e.target.value)}
                      placeholder="Search items..."
                      className="w-full pl-7 pr-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    {shoppingSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setShoppingSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Filter Pills */}
                {shoppingCategories.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 bg-slate-50/50 dark:bg-slate-900/30 px-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-sky-500" /> Category:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShoppingCategoryFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 transition whitespace-nowrap ${
                        shoppingCategoryFilter === 'all'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100'
                      }`}
                    >
                      <span>All Categories</span>
                      <span className="bg-slate-200/50 dark:bg-slate-700 px-1.5 rounded-full text-[9px]">
                        {shoppingList.length}
                      </span>
                    </button>

                    {shoppingCategories.map((cat) => {
                      const count = shoppingList.filter((item) => item.categoryId === cat.id).length;
                      const isSelected = shoppingCategoryFilter === cat.id;
                      return (
                        <div key={cat.id} className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setShoppingCategoryFilter(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 transition whitespace-nowrap ${
                              isSelected
                                ? 'text-white shadow-xs font-black'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100'
                            }`}
                            style={{
                              backgroundColor: isSelected ? cat.color || '#64748b' : undefined,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: isSelected ? '#ffffff' : cat.color || '#64748b' }}
                            />
                            <span>{cat.name}</span>
                            <span className={`px-1.5 rounded-full text-[9px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                              {count}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(cat.id, cat.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60"
                            title={`Delete "${cat.name}" category`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sub-actions for Checked & Hidden views */}
                {shoppingFilter === 'checked' && filteredShoppingList.length > 0 && (
                  <div className="flex justify-end pb-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        showConfirm(
                          'Hide Completed Lists',
                          'Move all completed lists to the Hidden section? They will not appear on exported PDFs or saved photos, but can be restored anytime from the Hidden tab.',
                          () => {
                            filteredShoppingList.forEach((i) => {
                              StorageService.updateShoppingListItem(i.id, { hidden: true, hiddenAt: new Date().toISOString() });
                            });
                            refreshData();
                            showToast('Completed lists moved to Hidden section');
                          }
                        );
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-[11px] font-bold flex items-center gap-1.5 transition border border-purple-200 dark:border-purple-800/50"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide All Completed</span>
                    </button>
                  </div>
                )}

                {shoppingFilter === 'hidden' && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/40 text-purple-900 dark:text-purple-200 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                      <EyeOff className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>Hidden lists are archived and will not appear on PDFs or saved photos</span>
                    </div>
                    {filteredShoppingList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          filteredShoppingList.forEach((i) => {
                            StorageService.updateShoppingListItem(i.id, { hidden: false });
                          });
                          refreshData();
                          showToast('All hidden lists restored to active shopping list');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore All</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Items List */}
                {filteredShoppingList.length === 0 ? (
                  <div className="bg-white/10 dark:bg-slate-900/50 rounded-2xl p-5 text-center text-white/90 border border-white/15 dark:border-slate-800">
                    <p className="text-xs font-medium">
                      {shoppingSearchQuery
                        ? 'No shopping items match your search.'
                        : shoppingFilter === 'hidden'
                        ? 'No hidden lists found. Completed lists marked as hidden will appear here.'
                        : shoppingFilter === 'unchecked'
                        ? 'All items bought! Good job.'
                        : shoppingFilter === 'checked'
                        ? 'No items have been checked off yet.'
                        : 'Your shopping list is empty. Add items above to prepare for your shopping trip.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredShoppingList.map((item, index) => {
                      const priceNum = item.estimatedPrice || 0;
                      const qtyVal = parseFloat(item.quantity) || 1;
                      const totalCost = priceNum * qtyVal;
                      const catObj = shoppingCategories.find((c) => c.id === item.categoryId);

                      return (
                        <React.Fragment key={item.id}>
                          <div
                            className={`bg-white dark:bg-slate-900 rounded-xl p-2.5 sm:p-3 border transition flex items-center justify-between gap-3 ${
                            item.hidden
                              ? 'border-purple-200 dark:border-purple-950/60 bg-purple-50/20 dark:bg-purple-950/10'
                              : item.checked
                              ? 'border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/20 dark:bg-emerald-950/5 opacity-75'
                              : 'border-slate-100 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Checked Checkbox Icon */}
                            {!item.hidden && (
                              <button
                                type="button"
                                onClick={() => handleToggleShoppingItemChecked(item.id, !item.checked)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                  item.checked
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:border-sky-500'
                                }`}
                              >
                                {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>
                            )}

                            {item.hidden && (
                              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <EyeOff className="w-3.5 h-3.5" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-xs font-bold block truncate ${
                                    item.hidden
                                      ? 'text-purple-900 dark:text-purple-200'
                                      : item.checked
                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                      : 'text-slate-800 dark:text-white'
                                  }`}
                                >
                                  {item.name}
                                </span>
                                {item.hidden && (
                                  <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 uppercase tracking-wider inline-block">
                                    HIDDEN
                                  </span>
                                )}
                                {catObj && (
                                  <span
                                    className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full text-white uppercase tracking-wider inline-block transform scale-95"
                                    style={{ backgroundColor: catObj.color || '#64748b' }}
                                  >
                                    {catObj.name}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                <span className="font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded font-mono">
                                  Qty: {item.quantity}
                                </span>
                                {item.estimatedPrice !== undefined && (
                                  <span className="font-medium">
                                    Est: {currency} {item.estimatedPrice.toLocaleString()} ea
                                  </span>
                                )}
                                {item.notes && (
                                  <span className="italic truncate max-w-[120px] sm:max-w-[180px]">
                                    • {item.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3">
                            {/* Estimated Total Cost */}
                            {item.estimatedPrice !== undefined && (
                              <span
                                className={`text-xs font-black font-mono text-right whitespace-nowrap ${
                                  item.hidden
                                    ? 'text-purple-700 dark:text-purple-300'
                                    : item.checked
                                    ? 'text-emerald-600/70 dark:text-emerald-400/70 line-through'
                                    : 'text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                {currency} {totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </span>
                            )}

                            {/* Hide List button for completed items */}
                            {item.checked && !item.hidden && (
                              <button
                                type="button"
                                onClick={() => {
                                  StorageService.updateShoppingListItem(item.id, { hidden: true, hiddenAt: new Date().toISOString() });
                                  refreshData();
                                  showToast(`"${item.name}" moved to Hidden lists`);
                                }}
                                className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center gap-1 transition border border-purple-200 dark:border-purple-800/60 shrink-0"
                                title="Hide list from active view & PDFs"
                              >
                                <EyeOff className="w-3 h-3" />
                                <span>Hide List</span>
                              </button>
                            )}

                            {/* Restore button for hidden items */}
                            {item.hidden && (
                              <button
                                type="button"
                                onClick={() => {
                                  StorageService.updateShoppingListItem(item.id, { hidden: false });
                                  refreshData();
                                  showToast(`"${item.name}" restored to active list`);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition border border-emerald-200 dark:border-emerald-800/60 shrink-0"
                                title="Restore list to active view"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore</span>
                              </button>
                            )}

                            <div className="flex items-center gap-1 border-l border-slate-100 dark:border-slate-800 pl-2">
                              {!item.hidden && (
                                <button
                                  type="button"
                                  onClick={() => startEditShoppingItem(item)}
                                  className="p-1 text-slate-400 hover:text-[#0284c7] transition rounded-lg"
                                  title="Edit item"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteShoppingItem(item.id, item.name)}
                                className="p-1 text-slate-400 hover:text-rose-500 transition rounded-lg"
                                title="Delete item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                        {(index + 1) % 6 === 0 && (
                          <div key={`inline-admob-shop-${item.id}`} className="py-1">
                            <AdMobNativeAd
                              context="inventory"
                              variant="in-feed"
                              unitId={ADMOB_UNITS.NATIVE_ADVANCED}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION 6: REPORT TAB                                                */}
        {/* ==================================================================== */}
        {currentCategory === 'money' && activeTab === 'report' && (
          <div className="space-y-3.5 animate-fadeIn">
            {sales.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-sky-100 dark:border-slate-800 shadow-lg space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center mx-auto">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  No Sales Data Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Reports, profit margin breakdowns, and visual sales trends will be generated automatically once you record sales.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('sales');
                    setShowSaleForm(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs shadow-md transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Go to Sales & Record Sale
                </button>
              </div>
            ) : (
              <>
                {/* Timeframe Filter Buttons: Today | This Week | This Month | This Year | All Time */}
                <div className="bg-white/10 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-white/20 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'This Week' },
                    { id: 'month', label: 'This Month' },
                    { id: 'year', label: 'This Year' },
                    { id: 'all', label: 'All Time' },
                  ].map((f) => {
                    const active = reportTimeFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        id={`btn-report-filter-${f.id}`}
                        type="button"
                        onClick={() => setReportTimeFilter(f.id as any)}
                        className={`flex-1 min-w-[72px] py-2 px-2.5 rounded-xl font-bold text-xs text-center transition whitespace-nowrap ${
                          active
                            ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-md scale-[1.02]'
                            : 'text-white/80 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>

            {/* Top Period Header & Action Controls */}
            <div className="flex items-center justify-between text-xs text-white px-1 gap-2">
              <span className="font-extrabold text-sm truncate">
                {getReportPeriodTitle()} • {periodSales.length} records
              </span>

              <div className="flex items-center gap-2 shrink-0">
                {/* Specific Date Filter Button */}
                <div className="relative">
                  <input
                    type="date"
                    value={reportCustomFilterDate}
                    onChange={(e) => {
                      setReportCustomFilterDate(e.target.value);
                      setReportTimeFilter('custom');
                    }}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    title="Filter by specific date"
                  />
                  <button
                    type="button"
                    className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1 font-semibold text-xs transition shadow-xs ${
                      reportTimeFilter === 'custom'
                        ? 'bg-white text-sky-700 shadow-sm'
                        : 'bg-white/15 hover:bg-white/25 text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {reportTimeFilter === 'custom'
                        ? new Date(reportCustomFilterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                        : 'Date'}
                    </span>
                  </button>
                </div>

                {/* Export Button */}
                <button
                  type="button"
                  onClick={() => handleExportReport('report')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-bold text-xs shadow-md hover:bg-slate-50 flex items-center gap-1.5 border border-sky-100 dark:border-slate-800 transition"
                >
                  <Download className="w-3.5 h-3.5 text-sky-600" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {/* Sales */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-sky-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  SALES
                </span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono mt-1 block">
                  {currency} {periodTotalSales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                  {periodSales.length} {periodSales.length === 1 ? 'transaction' : 'transactions'}
                </span>
              </div>

              {/* Profit */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-sky-100 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    PROFIT
                  </span>
                  <Info className="w-3 h-3 text-slate-400" />
                </div>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                  {currency} {periodTotalProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Items Sold */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-sky-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Items Sold
                </span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono mt-1 block">
                  {reportMetrics.itemsSold.toLocaleString()}
                </span>
              </div>

              {/* Expenses */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-sky-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Expenses
                </span>
                <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-1 block">
                  {currency} {reportMetrics.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Shopping Cost */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-sky-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Shopping Cost
                </span>
                <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1 block">
                  {currency} {reportMetrics.totalShoppingCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Demanded Debts */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-sky-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Demanded Debts
                </span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono mt-1 block">
                  {currency} {reportMetrics.totalDebtsDemanded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Paid Debts */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-sky-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Paid Debts
                </span>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                  {currency} {reportMetrics.totalDebtsPaid.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Staff Logged Sales */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-sky-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Staff Sales
                </span>
                <span className="text-lg font-extrabold text-purple-600 dark:text-purple-400 font-mono mt-1 block">
                  {currency} {workerPeriodSalesAnalytics.totalStaffSalesVolume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                  {workerPeriodSalesAnalytics.periodStaffSales.length} staff records
                </span>
              </div>

              {/* Agent Consignment Balance Owed */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-sky-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Agent Owed Bal
                </span>
                <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1 block">
                  {currency} {agentPeriodAnalytics.totalRemainingBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                  {agentPeriodAnalytics.totalConsignmentTaken > 0 ? `${currency} ${agentPeriodAnalytics.totalConsignmentTaken.toLocaleString()} taken` : '0 consigned'}
                </span>
              </div>
            </div>

            {/* DAILY / PERIOD BREAKDOWN Chart Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-lg border border-sky-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                    {reportChartData.chartTitle}
                  </h4>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    {reportChartData.subtitle}
                  </span>
                </div>

                <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setReportMetricView('sales')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      reportMetricView === 'sales'
                        ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Sales
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportMetricView('profit')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      reportMetricView === 'profit'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Profit
                  </button>
                </div>
              </div>

              {/* Chart Visualizer */}
              <div className="h-44 flex items-end gap-1 sm:gap-1.5 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                {reportChartData.items.map((item, idx) => {
                  const val = reportMetricView === 'sales' ? item.sales : item.profit;
                  const heightPercent = maxChartValue > 0 ? Math.max(6, (val / maxChartValue) * 100) : 6;

                  return (
                    <div
                      key={`${item.label}-${idx}`}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-0"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-30 bg-slate-900 text-white text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                        <span>{item.tooltip}</span>
                        <span className="font-bold font-mono">
                          {currency} {val.toLocaleString()}
                        </span>
                      </div>

                      <div
                        style={{ height: `${val > 0 ? heightPercent : 4}%` }}
                        className={`w-full rounded-t-sm transition-all ${
                          val > 0
                            ? reportMetricView === 'sales'
                              ? 'bg-sky-500 group-hover:bg-sky-600'
                              : 'bg-emerald-500 group-hover:bg-emerald-600'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>{reportChartData.items[0]?.label || ''}</span>
                <span>{reportChartData.items[Math.floor(reportChartData.items.length / 2)]?.label || ''}</span>
                <span>{reportChartData.items[reportChartData.items.length - 1]?.label || ''}</span>
              </div>
            </div>

            {/* AGENT CONSIGNMENT & AUDIT ANALYTICS CARD */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-lg border border-sky-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-white">
                      Agent Consignment & Ledger Analytics
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Consignment stock taken, cash paid & outstanding balance owed
                    </span>
                  </div>
                </div>
                <span className="text-xs font-extrabold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-xl">
                  {agentPeriodAnalytics.agentBreakdown.length} Agents
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Consigned Taken</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white font-mono mt-0.5 block">
                    {currency} {agentPeriodAnalytics.totalConsignmentTaken.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Cash Paid</span>
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono mt-0.5 block">
                    {currency} {agentPeriodAnalytics.totalCashPaid.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-center">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Owed Balance</span>
                  <span className="text-sm font-black text-amber-700 dark:text-amber-400 font-mono mt-0.5 block">
                    {currency} {agentPeriodAnalytics.totalRemainingBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Agent Breakdown Table */}
              <div className="overflow-x-auto no-scrollbar pt-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-400">
                      <th className="pb-2">Agent / Shop</th>
                      <th className="pb-2 text-right">Taken Value</th>
                      <th className="pb-2 text-right">Cash Paid</th>
                      <th className="pb-2 text-right">Balance Owed</th>
                      <th className="pb-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {agentPeriodAnalytics.agentBreakdown.map(({ agent, takenValue, cashPaid, remainingBalance }) => (
                      <tr key={agent.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                          {agent.agentName}
                          {agent.shopName && (
                            <span className="block text-[10px] text-slate-400 font-normal">{agent.shopName}</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                          {currency} {takenValue.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {currency} {cashPaid.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-mono text-amber-600 dark:text-amber-400 font-extrabold">
                          {currency} {remainingBalance.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setManagingAgent(agent)}
                            className="px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 text-sky-700 dark:text-sky-300 font-bold text-[10px] transition"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                    {agentPeriodAnalytics.agentBreakdown.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400 text-xs italic">
                          No agents configured yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* STAFF SALES & PERFORMANCE ANALYTICS CARD */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-lg border border-sky-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-white">
                      Staff Sales & Commission Analytics
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Logged worker sales volume & commission payouts
                    </span>
                  </div>
                </div>
                <span className="text-xs font-extrabold font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/80 px-2.5 py-1 rounded-xl">
                  {workerPeriodSalesAnalytics.workerBreakdown.length} Staff Members
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-1">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Staff Sales</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white font-mono mt-0.5 block">
                    {currency} {workerPeriodSalesAnalytics.totalStaffSalesVolume.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-900/40 text-center">
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Commissions Earned</span>
                  <span className="text-sm font-black text-purple-700 dark:text-purple-400 font-mono mt-0.5 block">
                    {currency} {workerPeriodSalesAnalytics.totalStaffCommissions.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Staff Sales Breakdown Table */}
              <div className="overflow-x-auto no-scrollbar pt-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-400">
                      <th className="pb-2">Staff Member</th>
                      <th className="pb-2 text-center">Sales Count</th>
                      <th className="pb-2 text-right">Total Revenue</th>
                      <th className="pb-2 text-right">Commission</th>
                      <th className="pb-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {workerPeriodSalesAnalytics.workerBreakdown.map(({ worker, salesCount, totalSales, totalCommission }) => (
                      <tr key={worker.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                          {worker.name}
                          {worker.role && (
                            <span className="block text-[10px] text-slate-400 font-normal">{worker.role}</span>
                          )}
                        </td>
                        <td className="py-2.5 text-center font-mono text-slate-600 dark:text-slate-300 font-bold">
                          {salesCount}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-900 dark:text-white font-black">
                          {currency} {totalSales.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-mono text-purple-600 dark:text-purple-400 font-extrabold">
                          {currency} {totalCommission.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setManagedWorker(worker)}
                            className="px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 text-sky-700 dark:text-sky-300 font-bold text-[10px] transition"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                    {workerPeriodSalesAnalytics.workerBreakdown.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400 text-xs italic">
                          No staff members configured yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

              </>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION 7.5: AGENTS TAB (Directory in Header Row 2)                 */}
        {/* ==================================================================== */}
        {currentCategory === 'people' && activeTab === 'agents' && (
          <div className="space-y-3 animate-fadeIn pb-8">
            {/* Header Title & Actions Card */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-900 rounded-2xl px-4 py-3.5 shadow-sm border border-sky-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Business Agents
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                      {agents.length}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Manage your business agents, shops, outlets & contacts
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (showAddAgentForm) {
                      handleCancelAgentForm();
                    } else {
                      setShowAddAgentForm(true);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-[0.98] ${
                    showAddAgentForm
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                      : 'bg-sky-600 hover:bg-sky-700 text-white'
                  }`}
                >
                  {showAddAgentForm ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Agent</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleExportReport('agents')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition"
                  title="Export Agents List (PDF)"
                >
                  <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Add / Edit Agent Form */}
            {showAddAgentForm && (
              <form
                onSubmit={handleSaveAgent}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-sky-200 dark:border-slate-700 space-y-3 animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    {editingAgentId ? 'Edit Agent Details' : 'Add New Agent'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelAgentForm}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile Picture Upload Card */}
                <div className="flex flex-col sm:flex-row items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <div className="relative group shrink-0">
                    {agentProfilePic ? (
                      <img
                        src={agentProfilePic}
                        alt="Agent preview"
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-sky-500/30 shadow-xs"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-100 dark:from-slate-800 dark:to-slate-700 border border-dashed border-sky-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400">
                        <User className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    {isUploadingAgentPic && (
                      <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-sky-500" />
                      <span>Agent Profile Picture</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Upload agent photo or outlet banner / logo
                    </p>

                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <input
                        ref={agentFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAgentPhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => agentFileInputRef.current?.click()}
                        disabled={isUploadingAgentPic}
                        className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-[0.98] shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{agentProfilePic ? 'Change Photo' : 'Upload Photo'}</span>
                      </button>

                      {agentProfilePic && (
                        <button
                          type="button"
                          onClick={() => setAgentProfilePic(undefined)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/40 dark:hover:text-rose-300 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Agent Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Agent Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={agentNameInput}
                        onChange={(e) => setAgentNameInput(e.target.value)}
                        placeholder="e.g. David Mukasa / John Kato"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Shop Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Shop / Outlet Name
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={agentShopNameInput}
                        onChange={(e) => setAgentShopNameInput(e.target.value)}
                        placeholder="e.g. Mukasa Electronics & Spares"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Contact / Phone */}
                  <div>
                    <PhoneInputField
                      id="input-agent-phone"
                      label="Contact / Phone"
                      required
                      value={agentContactInput}
                      onChange={(val) => setAgentContactInput(val)}
                      placeholder="700 123 456"
                    />
                  </div>

                  {/* Address / Location */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Shop Address / Location
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={agentAddressInput}
                        onChange={(e) => setAgentAddressInput(e.target.value)}
                        placeholder="e.g. Equatoria Mall, Shop G-12, Kampala"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Email (Optional) */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={agentEmailInput}
                        onChange={(e) => setAgentEmailInput(e.target.value)}
                        placeholder="e.g. agent@example.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes / Remarks */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Notes / Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={agentNotesInput}
                    onChange={(e) => setAgentNotesInput(e.target.value)}
                    placeholder="e.g. Regional distribution agent for Jinja branch, weekly deliveries on Tuesday"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelAgentForm}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold shadow-sm transition active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingAgentId ? 'Update Agent' : 'Save Agent'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Search Bar */}
            {agents.length > 0 && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={agentSearchQuery}
                  onChange={(e) => setAgentSearchQuery(e.target.value)}
                  placeholder="Search agents by name, shop, address, or contact..."
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                {agentSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAgentSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Agent Cards List */}
            {agents.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-sky-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 mx-auto flex items-center justify-center">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  No Business Agents Added Yet
                </h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Keep your business agents, shops, outlets, and contacts neatly organized in one place.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddAgentForm(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Agent</span>
                </button>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center border border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                No agents found matching "{agentSearchQuery}"
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {filteredAgents.map((agent, index) => {
                  const initials =
                    agent.agentName
                      .split(' ')
                      .map((p) => p[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'A';

                  const cleanPhone = agent.contact.replace(/[^\d+]/g, '');

                  return (
                    <React.Fragment key={agent.id}>
                      <div
                        className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-xs border border-sky-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-sky-300 dark:hover:border-slate-700 transition"
                      >
                      <div className="flex items-start sm:items-center gap-3">
                        {agent.profilePic ? (
                          <img
                            src={agent.profilePic}
                            alt={agent.agentName}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-sky-500/20 shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                            {initials}
                          </div>
                        )}

                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
                              {agent.agentName}
                            </h4>
                            {agent.shopName && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <Store className="w-3 h-3 text-sky-500 shrink-0" />
                                <span className="truncate max-w-[150px]">{agent.shopName}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                            {/* Contact / Phone */}
                            <a
                              href={`tel:${cleanPhone}`}
                              className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                              title="Call agent"
                            >
                              <Phone className="w-3 h-3 text-sky-500 shrink-0" />
                              <span>{agent.contact}</span>
                            </a>

                            {/* Address / Location */}
                            {agent.address && (
                              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className="truncate max-w-[200px]">{agent.address}</span>
                              </span>
                            )}

                            {/* Email if any */}
                            {agent.email && (
                              <span className="inline-flex items-center gap-1 text-slate-400 text-[10px]">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[150px]">{agent.email}</span>
                              </span>
                            )}
                          </div>

                          {agent.notes && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic pt-0.5 truncate max-w-md">
                              Note: {agent.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Agent Quick Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                        {/* Manage Agent Button */}
                        <button
                          type="button"
                          id={`btn-manage-agent-${agent.id}`}
                          onClick={() => setManagingAgent(agent)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-700 hover:from-indigo-700 hover:to-sky-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                          title="Manage items taken, prices, cash paid & remaining balance"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>Manage {agent.agentName ? agent.agentName.trim().split(/\s+/)[0] : 'Agent'}</span>
                        </button>

                        {/* Call Button */}
                        <a
                          href={`tel:${cleanPhone}`}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="Call agent"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </a>

                        {/* WhatsApp Button */}
                        <a
                          href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="WhatsApp message"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>

                        {/* Edit Agent */}
                        <button
                          type="button"
                          onClick={() => handleEditAgent(agent)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="Edit agent details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Agent */}
                        <button
                          type="button"
                          onClick={() => handleDeleteAgent(agent.id, agent.agentName)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="Delete agent"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {(index + 1) % 6 === 0 && (
                      <div key={`inline-admob-agent-${agent.id}`} className="py-1">
                        <AdMobNativeAd
                          context="inventory"
                          variant="in-feed"
                          unitId={ADMOB_UNITS.NATIVE_ADVANCED}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION 7B: WORKERS TAB (Top-level Staff Directory)                  */}
        {/* ==================================================================== */}
        {currentCategory === 'people' && activeTab === 'workers' && (
          <div className="space-y-3 animate-fadeIn pb-8">
            {/* Header Title & Actions Card */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-900 rounded-2xl px-4 py-3.5 shadow-sm border border-sky-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Staff List
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                      {workers.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Manage staff details, salaries, work schedules & contact info
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-export-workers-pdf"
                  type="button"
                  onClick={() => handleExportReport('workers')}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition shadow-sm border border-slate-200/60 dark:border-slate-700"
                  title="Export Staff Directory PDF"
                >
                  <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span className="hidden sm:inline">Export PDF</span>
                </button>

                <button
                  id="btn-toggle-add-worker"
                  type="button"
                  onClick={() => {
                    if (showAddWorkerForm) {
                      handleCancelWorkerForm();
                    } else {
                      setShowAddWorkerForm(true);
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                    showAddWorkerForm
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                      : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20'
                  }`}
                >
                  {showAddWorkerForm ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Staff</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Micro Stats Strip */}
            {workers.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-sky-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Total Staff</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white leading-tight">
                      {workers.length}
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-sky-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Est. Monthly Payroll</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">
                      {currency} {totalMonthlyPayroll.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ADD / EDIT WORKER FORM CARD */}
            {showAddWorkerForm && (
              <form
                onSubmit={handleSaveWorker}
                className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-lg border border-sky-200 dark:border-slate-800 space-y-4 animate-scaleUp"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-sky-600" />
                    {editingWorkerId ? 'Edit Staff Profile' : 'Add New Staff Member'}
                  </h4>
                  <button
                    type="button"
                    onClick={handleCancelWorkerForm}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Worker Profile Picture Upload Card */}
                <div className="flex flex-col sm:flex-row items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <div className="relative group shrink-0">
                    {workerProfilePic ? (
                      <img
                        src={workerProfilePic}
                        alt="Staff preview"
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-sky-500/30 shadow-xs"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-50 to-indigo-100 dark:from-slate-800 dark:to-slate-700 border border-dashed border-sky-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400">
                        <User className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    {isUploadingWorkerPic && (
                      <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-sky-500" />
                      <span>Staff Profile Picture</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Upload staff headshot or ID photo (JPG, PNG, WebP)
                    </p>

                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <input
                        ref={workerFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleWorkerPhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => workerFileInputRef.current?.click()}
                        disabled={isUploadingWorkerPic}
                        className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-[0.98] shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{workerProfilePic ? 'Change Photo' : 'Upload Photo'}</span>
                      </button>

                      {workerProfilePic && (
                        <button
                          type="button"
                          onClick={() => setWorkerProfilePic(undefined)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/40 dark:hover:text-rose-300 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Worker Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Staff Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={workerNameInput}
                        onChange={(e) => setWorkerNameInput(e.target.value)}
                        placeholder="e.g. John Mukasa"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Role / Job Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Role / Job Title
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={workerRoleInput}
                        onChange={(e) => setWorkerRoleInput(e.target.value)}
                        placeholder="e.g. Cashier, Sales Rep, Storekeeper"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Phone / Contact */}
                  <div>
                    <PhoneInputField
                      id="input-worker-phone"
                      label="Phone Number"
                      required
                      value={workerPhoneInput}
                      onChange={(val) => setWorkerPhoneInput(val)}
                      placeholder="772 123 456"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={workerEmailInput}
                        onChange={(e) => setWorkerEmailInput(e.target.value)}
                        placeholder="e.g. john@quickmart.ug"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* National ID / NIN */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      National ID / NIN Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={workerNinInput}
                        onChange={(e) => setWorkerNinInput(e.target.value)}
                        placeholder="e.g. CM95012345678A"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <IdCard className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Home Address */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Home Address / Residence
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={workerAddressInput}
                        onChange={(e) => setWorkerAddressInput(e.target.value)}
                        placeholder="e.g. Plot 14 Ntinda Road, House 8, Kampala"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Day Started Working */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Day Started Working
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={workerStartDateInput}
                        onChange={(e) => setWorkerStartDateInput(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Salary Amount & Period */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Salary ({currency}) & Payment Cycle
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={workerSalaryInput}
                          onChange={(e) => setWorkerSalaryInput(e.target.value)}
                          placeholder="e.g. 500000"
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                      <select
                        value={workerSalaryPeriod}
                        onChange={(e) => setWorkerSalaryPeriod(e.target.value as 'monthly' | 'weekly' | 'daily')}
                        className="py-2 px-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="monthly">Per Month</option>
                        <option value="weekly">Per Week</option>
                        <option value="daily">Per Day</option>
                      </select>
                    </div>
                  </div>

                  {/* Working Days */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Days Supposed to Work
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={workerWorkDaysInput}
                        onChange={(e) => setWorkerWorkDaysInput(e.target.value)}
                        placeholder="e.g. Monday - Saturday"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                    {/* Quick preset pills */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {['Mon - Sat', 'Mon - Fri', 'All 7 Days', 'Weekends Only'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setWorkerWorkDaysInput(preset)}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-400 font-medium transition"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Working Hours / Time */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Time / Hours Supposed to Work
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={workerWorkHoursInput}
                        onChange={(e) => setWorkerWorkHoursInput(e.target.value)}
                        placeholder="e.g. 8:00 AM - 5:00 PM"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                    {/* Quick preset pills */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {['8:00 AM - 5:00 PM', '8:30 AM - 6:00 PM', '9:00 AM - 8:00 PM', 'Day Shift', 'Night Shift'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setWorkerWorkHoursInput(preset)}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-400 font-medium transition"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Notes & Responsibilities <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={workerNotesInput}
                      onChange={(e) => setWorkerNotesInput(e.target.value)}
                      placeholder="e.g. Next of kin contact, assigned to counter 1, keyholder"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleCancelWorkerForm}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingWorkerId ? 'Update Staff Member' : 'Save Staff Member'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* SEARCH INPUT */}
            <div className="relative">
              <input
                id="search-workers-input"
                type="text"
                value={workerSearchQuery}
                onChange={(e) => setWorkerSearchQuery(e.target.value)}
                placeholder="Search staff by name, phone, address, schedule or role..."
                className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {workerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setWorkerSearchQuery('')}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* WORKERS LIST */}
            {filteredWorkers.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 mx-auto flex items-center justify-center">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                    {workerSearchQuery ? 'No staff match your search' : 'No Staff Registered Yet'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                    {workerSearchQuery
                      ? 'Try searching with different keywords.'
                      : 'Add your employees, sales team, cashiers, and shop staff to track their contact, salaries, and work schedules.'}
                  </p>
                </div>
                {!workerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setShowAddWorkerForm(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Staff Member</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredWorkers.map((worker, index) => {
                  const cleanPhone = worker.phone ? worker.phone.replace(/[^0-9+]/g, '') : '';
                  const initials = worker.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);

                  const periodLabel =
                    worker.salaryPeriod === 'daily'
                      ? '/ day'
                      : worker.salaryPeriod === 'weekly'
                      ? '/ week'
                      : '/ month';

                  const isExpanded = !!expandedWorkerIds[worker.id];

                  return (
                    <React.Fragment key={worker.id}>
                      <div
                        className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 shadow-sm border border-slate-100 dark:border-slate-800 hover:border-sky-200 dark:hover:border-slate-700 transition space-y-2.5"
                      >
                      {/* Top Row: Avatar, Name, Role, Actions */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {worker.profilePic ? (
                            <img
                              src={worker.profilePic}
                              alt={worker.name}
                              className="w-10 h-10 rounded-2xl object-cover ring-2 ring-sky-500/20 shadow-sm shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                                {worker.name}
                              </h4>
                              {worker.role && (
                                <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[10px] font-bold shrink-0">
                                  {worker.role}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Manage Attendance Quick Icon Button */}
                          <button
                            type="button"
                            id={`btn-worker-quick-attendance-${worker.id}`}
                            onClick={() => {
                              setManagedWorkerInitialTab('manage_attendance');
                              setManagedWorker(worker);
                            }}
                            className="p-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-600 dark:text-sky-400 transition"
                            title="Attendance Management"
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                          </button>

                          {/* Call Button */}
                          {cleanPhone && (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                              title="Call staff member"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* WhatsApp Button */}
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                              title="WhatsApp message"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Edit Staff */}
                          <button
                            type="button"
                            onClick={() => handleEditWorker(worker)}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                            title="Edit staff details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Staff */}
                          <button
                            type="button"
                            onClick={() => handleDeleteWorker(worker.id, worker.name)}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                            title="Delete staff member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Action Bar: Manage Staff & More Info */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                        <button
                          type="button"
                          id={`btn-worker-manage-${worker.id}`}
                          onClick={() => {
                            setManagedWorkerInitialTab('sales');
                            setManagedWorker(worker);
                          }}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-[0.98]"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-white" />
                          <span>
                            Manage {worker.name ? worker.name.trim().split(/\s+/).slice(-1)[0] : 'Staff'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleWorkerExpand(worker.id)}
                          className="py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-sky-50 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400 text-xs font-bold flex items-center gap-1.5 transition border border-slate-200/50 dark:border-slate-700/60"
                        >
                          <Info className="w-3.5 h-3.5 text-sky-500" />
                          <span>{isExpanded ? 'Hide Info' : 'More Info'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </div>

                      {/* Expandable Details Section */}
                      {isExpanded && (
                        <div className="space-y-2.5 pt-1.5 animate-fadeIn">
                          {/* Contact Details (Phone, Email, NIN) */}
                          {(worker.phone || worker.email || worker.nin) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800">
                              {worker.phone && (
                                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-sky-500" />
                                  {worker.phone}
                                </span>
                              )}
                              {worker.email && (
                                <span className="flex items-center gap-1 text-[11px]">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  {worker.email}
                                </span>
                              )}
                              {worker.nin && (
                                <span className="flex items-center gap-1 text-[11px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-mono font-semibold border border-slate-200 dark:border-slate-700">
                                  <IdCard className="w-3 h-3 text-sky-500" />
                                  NIN: {worker.nin}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Home Address */}
                          {worker.homeAddress && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-2.5 py-1.5 border border-slate-100 dark:border-slate-800">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="font-medium text-[11px] truncate">
                                <strong className="text-slate-700 dark:text-slate-200">Home Address:</strong> {worker.homeAddress}
                              </span>
                            </div>
                          )}

                          {/* Bottom Grid: Salary, Start Date, Work Days, Work Time */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                            {/* Salary */}
                            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl p-2 border border-emerald-100 dark:border-emerald-900/40">
                              <span className="text-[9.5px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block leading-tight">
                                Salary
                              </span>
                              <span className="font-extrabold text-xs text-emerald-800 dark:text-emerald-300">
                                {currency} {worker.salary ? worker.salary.toLocaleString() : '0'}{' '}
                                <span className="text-[10px] font-normal">{periodLabel}</span>
                              </span>
                            </div>

                            {/* Date Started */}
                            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 border border-slate-100 dark:border-slate-800">
                              <span className="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" /> Started Date
                              </span>
                              <span className="font-bold text-xs text-slate-800 dark:text-white">
                                {worker.startDate
                                  ? new Date(worker.startDate).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : 'Not specified'}
                              </span>
                            </div>

                            {/* Working Days */}
                            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 border border-slate-100 dark:border-slate-800">
                              <span className="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight flex items-center gap-1">
                                <CalendarDays className="w-2.5 h-2.5" /> Working Days
                              </span>
                              <span className="font-bold text-xs text-slate-800 dark:text-white truncate block" title={worker.workDays || 'N/A'}>
                                {worker.workDays || 'N/A'}
                              </span>
                            </div>

                            {/* Working Hours */}
                            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 border border-slate-100 dark:border-slate-800">
                              <span className="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> Work Hours
                              </span>
                              <span className="font-bold text-xs text-slate-800 dark:text-white truncate block" title={worker.workHours || 'N/A'}>
                                {worker.workHours || 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* Notes / Responsibilities */}
                          {worker.notes && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-amber-50/50 dark:bg-amber-950/20 px-2.5 py-1.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                              <strong className="text-amber-800 dark:text-amber-300 not-italic">Note:</strong> {worker.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {(index + 1) % 6 === 0 && (
                      <div key={`inline-admob-worker-${worker.id}`} className="py-1">
                        <AdMobNativeAd
                          context="inventory"
                          variant="in-feed"
                          unitId={ADMOB_UNITS.NATIVE_ADVANCED}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION 8: CLIENTS TAB (Top-level Directory in Header)               */}
        {/* ==================================================================== */}
        {currentCategory === 'people' && activeTab === 'customers' && (
          <div className="space-y-3 animate-fadeIn pb-8">
            {/* Header Title & Actions Card */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-900 rounded-2xl px-4 py-3.5 shadow-sm border border-sky-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Clients Directory
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                      {customers.length}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Manage client contacts, store locations & addresses
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (showAddCustomerForm) {
                      handleCancelCustomerForm();
                    } else {
                      setShowAddCustomerForm(true);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-[0.98] ${
                    showAddCustomerForm
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                      : 'bg-sky-600 hover:bg-sky-700 text-white'
                  }`}
                >
                  {showAddCustomerForm ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Client</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleExportReport('customers')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition"
                  title="Export Clients List (PDF)"
                >
                  <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Add / Edit Client Form */}
            {showAddCustomerForm && (
              <form
                onSubmit={handleSaveCustomer}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-sky-200 dark:border-slate-700 space-y-3 animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {editingCustomerId ? 'Edit Client Details' : 'Add New Client'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelCustomerForm}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile Picture Upload Card */}
                <div className="flex flex-col sm:flex-row items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <div className="relative group shrink-0">
                    {custProfilePic ? (
                      <img
                        src={custProfilePic}
                        alt="Client preview"
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-sky-500/30 shadow-xs"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-100 dark:from-slate-800 dark:to-slate-700 border border-dashed border-sky-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400">
                        <User className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    {isUploadingCustPic && (
                      <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-sky-500" />
                      <span>Client Profile Picture</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Upload client portrait or shop photo (JPG, PNG, WebP)
                    </p>

                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <input
                        ref={custFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCustPhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => custFileInputRef.current?.click()}
                        disabled={isUploadingCustPic}
                        className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-[0.98] shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{custProfilePic ? 'Change Photo' : 'Upload Photo'}</span>
                      </button>

                      {custProfilePic && (
                        <button
                          type="button"
                          onClick={() => setCustProfilePic(undefined)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/40 dark:hover:text-rose-300 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Client Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Client Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={custDirectoryName}
                        onChange={(e) => setCustDirectoryName(e.target.value)}
                        placeholder="e.g. John Doe / Sarah Namatovu"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Client Contact / Phone */}
                  <div>
                    <PhoneInputField
                      id="input-customer-phone"
                      label="Contact / Phone"
                      required
                      value={customerContact}
                      onChange={(val) => setCustomerContact(val)}
                      placeholder="700 123 456"
                    />
                  </div>

                  {/* Location / Address */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Location / Town / Address
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customerLocation}
                        onChange={(e) => setCustomerLocation(e.target.value)}
                        placeholder="e.g. Kampala Road, Plot 14, Ntinda"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Email (Optional) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="e.g. client@example.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes / Remarks */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Notes / Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="e.g. Regular buyer of bulk stock, delivery on Fridays"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelCustomerForm}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold shadow-sm transition active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingCustomerId ? 'Update Client' : 'Save Client'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Search Bar */}
            {customers.length > 0 && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="Search clients by name, location, or contact..."
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                {customerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Client Cards List */}
            {customers.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-sky-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 mx-auto flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  No Clients Added Yet
                </h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Keep your client contacts, addresses, and shop locations organized in one place.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerForm(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Client</span>
                </button>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center border border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                No clients found matching "{customerSearchQuery}"
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {filteredCustomers.map((cust, index) => {
                  const initials =
                    cust.name
                      .split(' ')
                      .map((p) => p[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'C';

                  const cleanPhone = cust.contact.replace(/[^\d+]/g, '');

                  return (
                    <React.Fragment key={cust.id}>
                      <div
                        className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-xs border border-sky-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-sky-300 dark:hover:border-slate-700 transition"
                      >
                      <div className="flex items-start sm:items-center gap-3">
                        {cust.profilePic ? (
                          <img
                            src={cust.profilePic}
                            alt={cust.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-sky-500/20 shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                            {initials}
                          </div>
                        )}

                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
                            {cust.name}
                          </h4>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                            {/* Contact / Phone */}
                            <a
                              href={`tel:${cleanPhone}`}
                              className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                              title="Call client"
                            >
                              <Phone className="w-3 h-3 text-sky-500 shrink-0" />
                              <span>{cust.contact}</span>
                            </a>

                            {/* Location / Address */}
                            {cust.location && (
                              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className="truncate max-w-[200px]">{cust.location}</span>
                              </span>
                            )}

                            {/* Email if any */}
                            {cust.email && (
                              <span className="inline-flex items-center gap-1 text-slate-400 text-[10px]">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[150px]">{cust.email}</span>
                              </span>
                            )}
                          </div>

                          {cust.notes && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic pt-0.5 truncate max-w-md">
                              Note: {cust.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Client Quick Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                        {/* Call Button */}
                        <a
                          href={`tel:${cleanPhone}`}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="Call client"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </a>

                        {/* WhatsApp Button */}
                        <a
                          href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="WhatsApp message"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>

                        {/* Edit Client */}
                        <button
                          type="button"
                          onClick={() => handleEditCustomer(cust)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="Edit client details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Client */}
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="Delete client"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {(index + 1) % 6 === 0 && (
                      <div key={`inline-admob-cust-${cust.id}`} className="py-1">
                        <AdMobNativeAd
                          context="inventory"
                          variant="in-feed"
                          unitId={ADMOB_UNITS.NATIVE_ADVANCED}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SETTLE DEBT MODAL */}
      {settleDebtModalOpen && debtToSettle && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl border border-sky-100 dark:border-slate-800 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Settle Debt
              </h3>
              <button
                onClick={() => setSettleDebtModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Debtor / Demanded</span>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">{debtToSettle.customerName}</span>
              
              {debtToSettle.paidAmount ? (
                <>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Demanded</span>
                    <span className="font-mono font-black text-slate-700 dark:text-slate-300 text-sm">
                      {currency} {debtToSettle.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Already Paid</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                      {currency} {debtToSettle.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Debt Balance</span>
                    <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                      {currency} {Math.max(0, debtToSettle.amount - debtToSettle.paidAmount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Demanding</span>
                  <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                    {currency} {debtToSettle.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Payment Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettleType('full')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    settleType === 'full'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Full Payment
                </button>
                <button
                  type="button"
                  onClick={() => setSettleType('partial')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    settleType === 'partial'
                      ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5" /> Partial Payment
                </button>
              </div>

              {settleType === 'partial' && (
                <div className="animate-fadeIn mt-3">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Enter Amount Paid ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {parseFloat(partialAmount) > 0 && parseFloat(partialAmount) < (debtToSettle.amount - (debtToSettle.paidAmount || 0)) && (
                    <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-2 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-lg border border-amber-100 dark:border-amber-900/50 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Debt balance will be {currency} {(debtToSettle.amount - (debtToSettle.paidAmount || 0) - parseFloat(partialAmount)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={submitDebtSettlement}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg active:scale-[0.99] transition"
            >
              Confirm Settlement
            </button>
          </div>
        </div>
      )}

      {/* RESTOCK MODAL */}
      {restockModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Restock Product
              </h3>
              <button
                onClick={() => setRestockModalProduct(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300">
              Add new incoming stock for <span className="font-bold">{restockModalProduct.name}</span>. Currently in stock: <span className="font-bold">{restockModalProduct.quantity} units</span>.
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Units to Add
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRestockQtyInput((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={restockQtyInput}
                  onChange={(e) => setRestockQtyInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-base"
                />
                <button
                  type="button"
                  onClick={() => setRestockQtyInput((q) => q + 1)}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestockModalProduct(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestock}
                className="flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-xs text-white shadow-md shadow-sky-600/30"
              >
                Confirm Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pick Product from Stock for Debt Record */}
      {debtStockPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-sky-100 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-sky-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Pick Product from Stock
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Select an item to auto-fill product and selling price
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDebtStockPickerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={debtStockSearchQuery}
                  onChange={(e) => setDebtStockSearchQuery(e.target.value)}
                  placeholder="Search stock by name or category..."
                  autoFocus
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                />
                {debtStockSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDebtStockSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Stock Items List */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-slate-100 dark:divide-slate-800">
              {products
                .filter((p) => {
                  if (!debtStockSearchQuery.trim()) return true;
                  const q = debtStockSearchQuery.toLowerCase();
                  return (
                    p.name.toLowerCase().includes(q) ||
                    (p.category && p.category.toLowerCase().includes(q))
                  );
                })
                .map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setDebtProductTaken(product.name);
                      if (!debtAmount || debtAmount === '0') {
                        setDebtAmount(String(product.sellingPrice || ''));
                      }
                      if (product.categoryId) {
                        setDebtCategoryId(product.categoryId);
                      }
                      setDebtStockPickerOpen(false);
                    }}
                    className="w-full p-2.5 text-left rounded-xl hover:bg-sky-50/70 dark:hover:bg-slate-800 flex items-center justify-between gap-3 transition group"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 block truncate group-hover:text-sky-600 dark:group-hover:text-sky-400">
                        {product.name}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>In stock: <strong className="text-slate-600 dark:text-slate-300">{product.quantity}</strong></span>
                        {product.category && <span>• {product.category}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-xs text-sky-600 dark:text-sky-400 block font-mono">
                        {currency} {product.sellingPrice?.toLocaleString() || 0}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">Select →</span>
                    </div>
                  </button>
                ))}
              {products.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  No products currently in stock.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Confirm Modal */}
      {confirmModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {confirmModalState.title}
              </h3>
              <button
                onClick={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {confirmModalState.message}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModalState.onConfirm();
                  setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white shadow-md transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELL MODAL */}
      {sellModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Sell Product
              </h3>
              <button
                onClick={() => setSellModalProduct(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-0.5">
                {sellModalProduct.name}
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                In Stock: {sellModalProduct.quantity}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Units Sold
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSellQtyInput((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={sellModalProduct.quantity}
                  value={sellQtyInput}
                  onChange={(e) => setSellQtyInput(Math.min(sellModalProduct.quantity, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                  className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-base"
                />
                <button
                  type="button"
                  onClick={() => setSellQtyInput((q) => Math.min(sellModalProduct.quantity, q + 1))}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSellModalProduct(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSell}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-md shadow-emerald-600/30"
              >
                Confirm Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal for Add Product */}
      <BarcodeScannerModal
        isOpen={isAddProductBarcodeScannerOpen}
        currency={currency}
        instantScan={true}
        onClose={() => setIsAddProductBarcodeScannerOpen(false)}
        onScanResult={(result) => {
          if (result.matchedProduct) {
            startEditProduct(result.matchedProduct);
            setToastMessage(`Product "${result.matchedProduct.name}" found. Loaded for editing.`);
          } else {
            setItemId(result.scannedCode);
            setToastMessage(`Barcode ${result.scannedCode} copied to Item ID.`);
          }
          setIsAddProductBarcodeScannerOpen(false);
        }}
      />

      {/* Staff Management Modal for Performance, Attendance, Sales, Losses, Incidents & Payroll */}
      {managedWorker && (
        <StaffManageModal
          worker={managedWorker}
          initialTab={managedWorkerInitialTab}
          currency={currency}
          businessProfile={business}
          onClose={() => setManagedWorker(null)}
          onWorkerUpdated={(updated) => {
            setWorkers(prev => prev.map(w => w.id === updated.id ? updated : w));
            setManagedWorker(updated);
          }}
        />
      )}

      {/* Agent Management Modal for Items Taken, Prices, Cash Paid & Remaining Balance */}
      {managingAgent && (
        <AgentManageModal
          agent={managingAgent}
          onClose={() => setManagingAgent(null)}
          currency={currency}
          businessProfile={business}
          products={products}
          categories={productCategories}
        />
      )}

      {/* EDIT SALE MODAL */}
      {editingSale && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleUp p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Edit Sale: {editingSale.productName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Quantity Sold
                </label>
                <input
                  type="number"
                  min="1"
                  value={editSaleQuantity}
                  onChange={(e) => setEditSaleQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-sm text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Selling Price ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={editSalePrice}
                  onChange={(e) => setEditSalePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-sm text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Customer / Client Name
                </label>
                <input
                  type="text"
                  value={editSaleCustomer}
                  onChange={(e) => setEditSaleCustomer(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-sm text-slate-800 dark:text-white"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>Updated Total:</span>
                <span className="text-sky-600 dark:text-sky-400 font-mono text-sm">
                  {currency} {(editSaleQuantity * editSalePrice).toLocaleString()}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditSale}
                  className="flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-xs text-white shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Native Advanced Ad when inside inventory category tabs */}
      {currentCategory !== null && (
        <div className="max-w-xl mx-auto w-full px-4 pt-3 pb-8">
          <AdMobNativeAd
            context="inventory"
            variant="compact"
            unitId={ADMOB_UNITS.NATIVE_ADVANCED}
          />
        </div>
      )}

    </div>
  );
};
