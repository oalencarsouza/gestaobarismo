
import React, { useState, useEffect } from 'react';
import { StatCardCompact } from '../StatCard';
import { StockStatusBadge } from '../StatusBadge';
import { supabase } from '../../lib/supabase';
import { ProductModal } from '../ProductModal';
import { ConfirmModal } from '../ConfirmModal';
import { AddStockModal } from '../AddStockModal';
import { useNotification } from '../../contexts/NotificationContext';
import type { Product, Category } from '../../types';
import { Search, PlusCircle, Edit2, Trash2, Loader2, ChevronLeft, ChevronRight, PackagePlus } from 'lucide-react';
import { getUniqueCategories } from '../../lib/data-utils';

type StockFilterStatus = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export const Stock: React.FC = () => {
    const { showSuccess, showError } = useNotification();
    const isViewer = localStorage.getItem('userRole') === 'viewer';
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<StockFilterStatus>('all');
    const [filterSlideIndex, setFilterSlideIndex] = useState(0);

    // UI States
    const [isIdLoading, setIsIdLoading] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const updateItemsPerPage = () => {
            setItemsPerPage(window.innerWidth < 768 ? 5 : 10);
        };
        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);
        return () => window.removeEventListener('resize', updateItemsPerPage);
    }, []);

    // Delete Confirmation State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<string | null>(null);

    // Add Stock Modal State
    const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryModalTab, setCategoryModalTab] = useState<'create' | 'delete'>('create');
    const [categoriesToDelete, setCategoriesToDelete] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch categories
            const { data: cats, error: catError } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (catError) throw catError;
            setCategories(getUniqueCategories(cats || []));

            // Fetch products with stock
            const { data: prods, error: prodError } = await supabase
                .from('products')
                .select(`
                    *,
                    stock (*)
                `)
                .order('name');

            if (prodError) throw prodError;
            setProducts(prods || []);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            showError('Não foi possível carregar os dados do estoque.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data: any) => {
        setIsIdLoading('saving');
        try {
            const { id, quantity, min_quantity, unit } = data;

            // Clean payload for products table
            const productPayload = {
                name: data.name,
                category_id: data.category_id,
                price: Number(data.price), // Ensure number
                cost_price: Number(data.cost_price),
                description: data.description,
                // Add other fields if necessary, but ignore 'stock' and others
            };

            if (id) {
                // Update Product
                const { data: updatedProd, error: prodError } = await supabase
                    .from('products')
                    .update(productPayload)
                    .eq('id', id)
                    .select();

                if (prodError) throw prodError;
                if (!updatedProd || updatedProd.length === 0) throw new Error('Produto não atualizado (possível erro de permissão)');

                // Update Stock
                const { error: stockError } = await supabase
                    .from('stock')
                    .update({ quantity, min_quantity, unit })
                    .eq('product_id', id);

                if (stockError) throw stockError;
            } else {
                // Insert Product
                const { data: newProd, error: prodError } = await supabase
                    .from('products')
                    .insert([productPayload])
                    .select(); // REMOVED .single()

                if (prodError) throw prodError;
                if (!newProd || newProd.length === 0) throw new Error('Erro ao criar produto');
                const createdProduct = newProd[0];

                // Insert Stock
                const { error: stockError } = await supabase
                    .from('stock')
                    .insert([{
                        product_id: createdProduct.id,
                        quantity,
                        min_quantity,
                        unit
                    }]);

                if (stockError) throw stockError;
            }

            await fetchData();
            setIsEditModalOpen(false);
            showSuccess('Produto salvo com sucesso!');
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            showError(error.message || 'Erro ao salvar produto.');
        } finally {
            setIsIdLoading(null);
        }
    };

    const handleDeleteClick = (id: string) => {
        setProductToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;

        setIsIdLoading(productToDelete);
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productToDelete);

            if (error) throw error;
            setProducts(products.filter(p => p.id !== productToDelete));
            showSuccess('Produto excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir:', error);
            showError('Erro ao excluir o produto.');
        } finally {
            setIsIdLoading(null);
            setProductToDelete(null);
        }
    };


    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        if (categories.length >= 18) { // Lanches, Drinks, Extras + 15 custom
            showError("O sistema suporta no máximo 15 categorias personalizadas.");
            return;
        }

        setIsIdLoading('creating_category');
        try {
            const clientId = localStorage.getItem('clientId');
            const { error } = await supabase
                .from('categories')
                .insert([{ name: newCategoryName.trim(), client_id: clientId }]);
            
            if (error) throw error;
            showSuccess('Categoria criada com sucesso!');
            setNewCategoryName('');
            setIsAddCategoryModalOpen(false);
            fetchData();
        } catch (err: any) {
            console.error('Erro ao criar categoria:', err);
            showError('Erro ao criar categoria.');
        } finally {
            setIsIdLoading(null);
        }
    };

    const handleDeleteCategories = async () => {
        if (categoriesToDelete.length === 0) return;
        setIsIdLoading('deleting_categories');
        try {
            const { error: delErr } = await supabase
                .from('categories')
                .delete()
                .in('id', categoriesToDelete);

            if (delErr) {
                if (delErr.code === '23503') {
                    throw new Error('Você precisa remover ou realocar os produtos vinculados antes de excluir a categoria.');
                }
                throw delErr;
            }
            
            showSuccess(`${categoriesToDelete.length} categoria(s) excluída(s) com sucesso!`);
            setCategoriesToDelete([]);
            fetchData();
        } catch (err: any) {
            console.error('Erro ao excluir categorias:', err);
            showError(err.message || 'Erro ao excluir categorias.');
        } finally {
            setIsIdLoading(null);
        }
    };

    const handleAddStock = async (productId: string, quantityToAdd: number) => {
        setIsIdLoading('adding_stock');
        try {
            const product = products.find(p => p.id === productId);
            if (!product || !product.stock) throw new Error('Produto não encontrado ou sem estoque inicial.');

            const newQuantity = (product.stock.quantity || 0) + quantityToAdd;

            const { error } = await supabase
                .from('stock')
                .update({ quantity: newQuantity })
                .eq('product_id', productId);

            if (error) throw error;

            // Optimistic update
            setProducts(products.map(p =>
                p.id === productId
                    ? { ...p, stock: { ...p.stock!, quantity: newQuantity } }
                    : p
            ));

            showSuccess(`Adicionado +${quantityToAdd} unidades ao estoque de ${product.name}!`);
            setIsAddStockModalOpen(false);
        } catch (error: any) {
            console.error('Erro ao adicionar estoque:', error);
            showError('Erro ao atualizar estoque.');
        } finally {
            setIsIdLoading(null);
        }
    };

    const filteredProducts = products.filter(product => {
        const categoryName = categories.find(c => c.id === product.category_id)?.name || 'Sem Categoria';
        const matchesCategory = selectedCategory === 'Todos' || categoryName === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());

        // Status Filter Logic
        let matchesStatus = true;
        const qty = product.stock?.quantity || 0;
        const min = product.stock?.min_quantity || 0;

        if (filterStatus === 'in_stock') {
            matchesStatus = qty >= min;
        } else if (filterStatus === 'low_stock') {
            matchesStatus = qty < min;
        } else if (filterStatus === 'out_of_stock') {
            matchesStatus = qty === 0;
        }

        return matchesCategory && matchesSearch && matchesStatus;
    }).sort((a, b) => {
        if (filterStatus === 'low_stock') {
            const qtyA = a.stock?.quantity || 0;
            const qtyB = b.stock?.quantity || 0;
            // Prioritize items with quantity > 0 over items with quantity === 0
            if (qtyA > 0 && qtyB === 0) return -1;
            if (qtyA === 0 && qtyB > 0) return 1;
        }
        return 0;
    });

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory, searchTerm, filterStatus]);

    // Pagination Logic
    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

    const lowStockCount = products.filter(p => p.stock && p.stock.quantity < p.stock.min_quantity).length;
    const outOfStockCount = products.filter(p => p.stock && p.stock.quantity === 0).length;

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background-dark">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 overflow-y-auto overflow-x-hidden min-w-0 bg-background-dark">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-white text-3xl font-black tracking-tight">Controle de Estoque</h2>
                    <p className="text-gray-400 text-base mt-1">Gerencie produtos e quantidades em tempo real</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsAddStockModalOpen(true)}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-lg font-bold transition-all"
                    >
                        <PackagePlus size={20} className="text-primary" />
                        Adicionar Estoque
                    </button>
                    {!isViewer && (
                        <button
                            onClick={() => { setEditingProduct(undefined); setIsEditModalOpen(true); }}
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all"
                        >
                            <PlusCircle size={20} />
                            Novo Produto
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCardCompact
                    icon="inventory_2"
                    label="Total de Produtos"
                    value={products.length}
                    onClick={() => setFilterStatus('all')}
                    isActive={filterStatus === 'all'}
                />
                <StatCardCompact
                    icon="check_circle"
                    label="Em Estoque"
                    value={products.length - lowStockCount}
                    iconBgColor="bg-green-500/10"
                    iconColor="text-green-500"
                    onClick={() => setFilterStatus('in_stock')}
                    isActive={filterStatus === 'in_stock'}
                />
                <StatCardCompact
                    icon="warning"
                    label="Estoque Baixo"
                    value={lowStockCount}
                    iconBgColor="bg-yellow-500/10"
                    iconColor="text-yellow-500"
                    onClick={() => setFilterStatus('low_stock')}
                    isActive={filterStatus === 'low_stock'}
                />
                <StatCardCompact
                    icon="error"
                    label="Sem Estoque"
                    value={outOfStockCount}
                    iconBgColor="bg-red-500/10"
                    iconColor="text-red-500"
                    onClick={() => setFilterStatus('out_of_stock')}
                    isActive={filterStatus === 'out_of_stock'}
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-1 w-full md:max-w-xs">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-primary/50 transition-colors">
                        <Search className="text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar produto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-white placeholder:text-gray-600 flex-1 outline-none py-0.5 text-xs font-black uppercase tracking-widest"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button
                        onClick={() => setFilterSlideIndex(prev => Math.max(0, prev - 1))}
                        disabled={filterSlideIndex === 0}
                        className="size-10 flex shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 disabled:opacity-20 transition-all"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <div className="flex-1 md:flex-none overflow-hidden max-w-[180px] md:max-w-md">
                        <div className="flex gap-2 transition-all duration-300">
                            {(() => {
                                const allOptions = ['Todos', ...categories.filter(c => !['Lanches', 'Drinks', 'Extras'].includes(c.name)).map(c => c.name)].slice(0, 16);
                                const maxVisible = typeof window !== 'undefined' && window.innerWidth >= 768 ? 4 : 2;
                                const visibleOptions = allOptions.slice(filterSlideIndex, filterSlideIndex + maxVisible);

                                return visibleOptions.map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-1 md:flex-none ${selectedCategory === category
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                                            }`}
                                    >
                                        {category}
                                    </button>
                                ));
                            })()}
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            const allOptionsCount = Math.min(16, 1 + categories.filter(c => !['Lanches', 'Drinks', 'Extras'].includes(c.name)).length);
                            const maxVisible = typeof window !== 'undefined' && window.innerWidth >= 768 ? 4 : 2;
                            setFilterSlideIndex(prev => Math.min(allOptionsCount - maxVisible, prev + 1));
                        }}
                        disabled={
                            (() => {
                                const count = Math.min(16, 1 + categories.filter(c => !['Lanches', 'Drinks', 'Extras'].includes(c.name)).length);
                                const maxVisible = typeof window !== 'undefined' && window.innerWidth >= 768 ? 4 : 2;
                                return filterSlideIndex >= Math.max(0, count - maxVisible);
                            })()
                        }
                        className="size-10 shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 disabled:opacity-20 transition-all"
                    >
                        <ChevronRight size={18} />
                    </button>

                    {!isViewer && (
                        <button
                            onClick={() => setIsAddCategoryModalOpen(true)}
                            className="ml-2 shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] whitespace-nowrap transition-all flex items-center justify-center gap-1.5 border border-orange-500/20 text-orange-500 hover:bg-orange-500/20"
                        >
                            <PlusCircle size={14} />
                            CATEGORIA
                        </button>
                    )}
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10 bg-white/5 shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 text-gray-400 text-xs font-bold border-b border-white/10 uppercase tracking-wider">
                            <th className="px-6 py-5">Produto</th>
                            <th className="px-6 py-5">Categoria</th>
                            <th className="px-6 py-5">Preço</th>
                            <th className="px-6 py-5">Quantidade</th>
                            <th className="px-6 py-5">Status</th>
                            <th className="px-6 py-5 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-sm">
                        {paginatedProducts.map(product => {
                            const category = categories.find(c => c.id === product.category_id);
                            const isRowLoading = isIdLoading === product.id;

                            return (
                                <tr key={product.id} className={`group hover:bg-white/[0.03] transition-colors ${isRowLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary text-xl">
                                                    {category?.icon || 'local_bar'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{product.name}</span>
                                                <span className="text-gray-500 text-[10px]">{product.id.slice(0, 8)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 rounded-lg bg-white/5 text-gray-400 text-xs font-medium border border-white/5">
                                            {category?.name || 'Sem Categoria'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-primary font-black font-numbers text-lg">R$ {product.price.toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-white font-black text-xl font-numbers">{product.stock?.quantity}</span>
                                                    <span className="text-gray-500 text-[10px] uppercase font-bold">{product.stock?.unit || 'un'}</span>
                                                </div>
                                                <span className="text-gray-600 text-[10px] font-bold">MÍN: {product.stock?.min_quantity}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StockStatusBadge
                                            current={product.stock?.quantity || 0}
                                            min={product.stock?.min_quantity || 0}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        {!isViewer && (
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => { setEditingProduct(product); setIsEditModalOpen(true); }}
                                                    className="p-2 rounded-lg hover:bg-blue-500/10 text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(product.id)}
                                                    className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden flex flex-col gap-4">
                {paginatedProducts.map(product => {
                    const category = categories.find(c => c.id === product.category_id);
                    const isQtyLow = (product.stock?.quantity || 0) < (product.stock?.min_quantity || 0);

                    return (
                        <div key={product.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary text-xl">
                                            {category?.icon || 'local_bar'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-black text-sm uppercase italic leading-tight">{product.name}</span>
                                        <span className="text-gray-500 text-[10px] font-black tracking-widest uppercase">{category?.name || 'Sem Categoria'}</span>
                                    </div>
                                </div>
                                {!isViewer && (
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => { setEditingProduct(product); setIsEditModalOpen(true); }}
                                            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(product.id)}
                                            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Preço Sugerido</span>
                                    <span className="text-primary font-black font-numbers text-lg">R$ {product.price.toFixed(2)}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Quantidade Real</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`font-black text-xl font-numbers ${isQtyLow ? 'text-red-500 underline decoration-red-500/50' : 'text-white'}`}>
                                            {product.stock?.quantity}
                                        </span>
                                        <span className="text-gray-500 text-[10px] uppercase font-bold">{product.stock?.unit || 'un'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
                <span>
                    Mostrando {paginatedProducts.length} de {totalItems} produtos
                </span>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-white/5 disabled:opacity-50 hover:bg-white/10 transition-colors disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-all ${currentPage === page
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-2 rounded-lg bg-white/5 disabled:opacity-50 hover:bg-white/10 transition-colors disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <ProductModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSave}
                categories={categories}
                initialData={editingProduct}
            />

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Produto"
                message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
                confirmText="Excluir"
                isDestructive
            />

            <AddStockModal
                isOpen={isAddStockModalOpen}
                onClose={() => setIsAddStockModalOpen(false)}
                onSave={handleAddStock}
                categories={categories}
                products={products}
            />

            {/* Modal de Gestão de Categorias */}
            {isAddCategoryModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#120f0e] border border-orange-500/20 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(249,115,22,0.1)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/5 flex flex-col gap-5 bg-white/5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                                    Categorias
                                </h2>
                                <button onClick={() => { setIsAddCategoryModalOpen(false); setCategoriesToDelete([]); }} className="size-8 rounded-xl bg-white/5 text-zinc-500 hover:text-white transition-all flex items-center justify-center">
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>
                            <div className="flex bg-black/40 rounded-xl p-1 gap-1">
                                <button
                                    onClick={() => setCategoryModalTab('create')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${categoryModalTab === 'create' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    Criar
                                </button>
                                <button
                                    onClick={() => setCategoryModalTab('delete')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${categoryModalTab === 'delete' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>

                        {categoryModalTab === 'create' ? (
                            <form onSubmit={handleCreateCategory} className="p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                <div>
                                    <label className="block text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Nome da Nova Categoria</label>
                                    <input
                                        type="text"
                                        required
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Ex: Cervejas Premium"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-colors font-medium placeholder:text-zinc-600"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isIdLoading === 'creating_category' || !newCategoryName.trim()}
                                    className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-[0.2em] text-[11px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20"
                                >
                                    {isIdLoading === 'creating_category' ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar Criação'}
                                </button>
                            </form>
                        ) : (
                            <div className="p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <label className="block text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">
                                    Selecione até 2 categorias
                                </label>
                                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                    {categories.map(cat => {
                                        const isSelected = categoriesToDelete.includes(cat.id);
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setCategoriesToDelete(prev => prev.filter(id => id !== cat.id));
                                                    } else {
                                                        if (categoriesToDelete.length >= 2) return;
                                                        setCategoriesToDelete(prev => [...prev, cat.id]);
                                                    }
                                                }}
                                                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${isSelected ? 'bg-red-500/10 border-red-500/50 text-white' : 'bg-black/40 border-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'}`}
                                            >
                                                <span className="font-bold text-xs uppercase tracking-widest truncate max-w-[200px]">{cat.name}</span>
                                                <div className={`size-5 rounded-md flex items-center justify-center border transition-all ${isSelected ? 'border-red-500 bg-red-500' : 'border-zinc-700 bg-transparent'}`}>
                                                    {isSelected && <span className="material-symbols-outlined text-[14px] text-white">check</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={handleDeleteCategories}
                                    disabled={isIdLoading === 'deleting_categories' || categoriesToDelete.length === 0}
                                    className="w-full mt-2 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.2em] text-[11px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-red-500/20"
                                >
                                    {isIdLoading === 'deleting_categories' ? <Loader2 className="animate-spin" size={16} /> : `Excluir ${categoriesToDelete.length} Selecionada(s)`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
};

