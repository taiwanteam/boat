class DragonBoatGame extends Phaser.Scene {
    constructor() {
        super({ key: 'DragonBoatGame' });
        this.correctAnswersCount = 0; // 答對的題數
        this.totalQuestions = 10; // 總題數
        this.passThreshold = 5; // 完成题數過關
        this.currentQuestionIndex = 0; // 当前题目索引
        this.isWaterMoving = true;
        this.isGameOver = false; // 游戏结束标志
    }

    preload() {
        this.load.image('boat', 'assets/boat.png'); // 龍舟
        this.load.image('water', 'assets/bg.png'); // 背景
        this.load.image('obstacle', 'assets/stone.png'); // 障礙物
        this.load.image('zongzi', 'assets/rice.png'); // 粽子
        this.load.text('questions', 'QA/QA.csv');// 加載文件
    }

    create() {
        let centerX = this.cameras.main.centerX;
        let centerY = this.cameras.main.centerY;
        let screenWidth = this.cameras.main.width;
        let screenHeight = this.cameras.main.height;

        this.water = this.add.tileSprite(centerX, centerY, screenWidth, screenHeight, 'water');
        this.water.setOrigin(0.5, 0.5);

        //this.cursors = this.input.keyboard.createCursorKeys();
        // 顯示開始畫面
        let titleTextsize = Math.min(this.cameras.main.width, this.cameras.main.height) * 0.05;
        this.titleText = this.add.text(centerX, centerY, "彰稅龍舟挑戰賽", {
            fontSize: titleTextsize + "px",
            color: "#008080",
            //backgroundColor: "#000",
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        // 開始按紐
        this.startButton = this.add.text(centerX, centerY * 1.2, "Ready Go", {
            fontSize: titleTextsize + "px",
            color: "#fff",
            backgroundColor: "#008000",
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

        //mouse enter in game
        this.startButton.on('pointerdown', () => this.startGame());
        // keyboard enter in game
        // this.input.keyboard = this.input.keyboard || this.input.keyboard.createCursorKeys();
        // this.input.keyboard.once("keydown-ENTER", () => {
        //     this.startGame();
        // });
    }

    startGame() {
        this.startTime = this.time.now;
        this.titleText.destroy();
        this.startButton.destroy();
        this.isGameStarted = true;
        let centerX = this.cameras.main.centerX;
        let centerY = this.cameras.main.centerY;
        let screenWidth = this.cameras.main.width;
        let screenHeight = this.cameras.main.height;

        // 在左上角顯示答對題數
        let catsize = Math.min(this.cameras.main.width, this.cameras.main.height) * 0.04;
        this.correctAnswersText = this.add.text(centerX, centerX * 0.05, "答對題數:" + this.correctAnswersCount + "/" + this.passThreshold, {
            fontSize: catsize + "px",
            color: "#fff",
            backgroundColor: "#800080",
            padding: { x: 10, y: 8 }
        }).setDepth(100).setOrigin(0.5);
        //設定船的屬性
        let boatszie = Math.min(this.cameras.main.width, this.cameras.main.height) * 0.0003;
        this.boat = this.physics.add.sprite(centerX, screenHeight - 100, 'boat');
        // this.boat.setScale(0.2);
        this.boat.setScale(boatszie);
        this.boat.setCollideWorldBounds(true);
        this.boat.setDrag(200);
        this.boat.setMaxVelocity(400);
        this.boat.setAngle(0);
        // this.cursors = this.input.keyboard.createCursorKeys();
        this.isSpinning = false; // 控制旋轉狀態
        this.isAnswering = false; // 控制答题狀態

        // 創建障礙物和粽子
        this.obstacles = this.physics.add.group();
        this.zongzis = this.physics.add.group();

        //存储定时器
        this.obstacleTimer = this.time.addEvent({
            delay: 500,
            callback: this.spawnObstacle,
            callbackScope: this,
            loop: true
        });

        this.zongziTimer = this.time.addEvent({
            delay: 3000,
            callback: this.spawnZongzi,
            callbackScope: this,
            loop: true
        });

        // 碰撞檢測
        this.physics.add.collider(this.boat, this.obstacles, this.hitObstacle, null, this);
        this.physics.add.overlap(this.boat, this.zongzis, this.collectZongzi, null, this);

        //手機操縱
        this.input.on('pointermove', (pointer) => {
            if (!this.isSpinning && !this.isAnswering) {
                let minX = 0; // 最小 X 值，船最左邊
                let maxX = this.cameras.main.width; // 最大 X 值，船最右邊
                this.boat.x = Phaser.Math.Clamp(pointer.x, minX, maxX);
            }
        });

        //讀取csv
        let csvContent = this.cache.text.get('questions');
        let rows = csvContent.split('\n').filter(row => row.trim().length > 0);

        this.allQuestions = rows.map(row => {
            let columns = row.split(',');
            return {
                question: columns[0].trim(),
                answers: [columns[1].trim(), columns[2].trim(), columns[3].trim(), columns[4].trim()],
                correctAnswer: columns[5].trim()
            };
        });

        // 隨機題數
        this.questions = Phaser.Utils.Array.Shuffle(this.allQuestions).slice(0, this.totalQuestions);
        window.addEventListener('resize', resizeGame);

    }

    update() {
        // 结束时不再更新任何内容
        if (this.isGameOver || !this.isGameStarted) return;
        // 背景滾動
        this.water.tilePositionY -= 2;
        // 障礙物超出後消失
        this.obstacles.children.iterate(obstacle => {
            if (obstacle && obstacle.y > this.cameras.main.height) {
                obstacle.destroy();
            }
        });
        // 粽子超出後消失
        this.zongzis.children.iterate(zongzi => {
            if (zongzi && zongzi.y > this.cameras.main.height) {
                zongzi.destroy();
            }
        });
    }

    //障礙物向下移動
    spawnObstacle() {
        let x = Phaser.Math.Between(50, this.cameras.main.width - 50);
        let obstacle = this.obstacles.create(x, -50, 'obstacle');
        let obstaclesize = Math.min(this.cameras.main.width, this.cameras.main.height) * 0.00035;
        obstacle.setVelocityY(300);
        //obstacle.setScale(0.2);
        obstacle.setScale(obstaclesize);
        obstacle.setImmovable(true);
    }

    //粽子向下移動
    spawnZongzi() {
        let x = Phaser.Math.Between(50, this.cameras.main.width - 50);
        let zongzi = this.zongzis.create(x, -40, 'zongzi');
        let zongzisize = Math.min(this.cameras.main.width, this.cameras.main.height) * 0.00035;
        zongzi.setVelocityY(200); // 粽子向下移动
        zongzi.setScale(zongzisize);
        zongzi.setImmovable(true);
    }

    //障礙物撞後效果
    hitObstacle(boat, obstacle) {
        this.isSpinning = true;
        boat.setVelocity(0, 0);
        boat.setAngularVelocity(200);
        obstacle.destroy(); // 碰撞后障碍物消失
        //碰撞后後1.5秒
        this.time.delayedCall(1500, () => {
            boat.setAngularVelocity(0);
            boat.setAngle(0);
            this.isSpinning = false;
        }, [], this);
    }

    //粽子撞後效果
    collectZongzi(boat, zongzi) {
        this.isAnswering = true; // 进入答题状态
        zongzi.destroy(); // 移除粽子
        this.showQuestion(); // 弹出题目
        // this.canControl = true; // **恢復鍵盤控制**
    }

    //顯示題目
    showQuestion() {
        let centerX = this.cameras.main.centerX;
        let centerY = this.cameras.main.centerY;
        if (this.currentQuestionIndex >= this.questions.length) return;
        this.isAnswering = true;
        this.physics.pause();
        this.obstacleTimer.paused = true;
        this.zongziTimer.paused = true;

        // 清理问題
        if (this.questionText) {
            this.questionText.destroy();
            this.answerButtons.forEach(btn => btn.destroy());
        }
        let randomQuestion = this.questions[this.currentQuestionIndex];
        this.currentQuestionIndex++;
        let screenSize = Math.min(this.cameras.main.width, this.cameras.main.height);
        let textSize = Math.max(18, screenSize * 0.03); // 保证最小 18px

        this.questionText = this.add.text(centerX, centerY * 1, randomQuestion.question, {
            fontSize: textSize + "px",
            color: "#fff",
            backgroundColor: "#008080",
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);

        // 初始化選擇索引和按鈕
        this.selectedIndex = 0; // 默認第一個選項
        this.answerButtons = [];

        // **随機排列選項**
        let shuffledAnswers = Phaser.Utils.Array.Shuffle([...randomQuestion.answers]);
        this.answerButtons = [];

        shuffledAnswers.forEach((answer, index) => {
            let btn = this.add.text(centerX, centerY * 1.15 + index * (textSize * 2), answer, {
                fontSize: textSize + "px",
                color: "#fff", // 初始白色
                backgroundColor: "#008080",
                padding: { x: 10, y: 5 }
            }).setOrigin(0.5);

            btn.setInteractive();

            // **滑鼠點選項**
            btn.on('pointerdown', () => {
                this.selectedIndex = index;

                // 更新所有按钮颜色
                this.answerButtons.forEach((b, i) => {
                    b.setColor(i === this.selectedIndex ? "#ff0" : "#fff"); // 选中的变黄，其他变白
                });

                // **立即檢查答案**
                this.checkAnswer(btn.text, randomQuestion.correctAnswer);
            });

            this.answerButtons.push(btn);
        });
    }
    updateSelectionColor() {
        this.answerButtons.forEach((btn, i) => {
            btn.setColor(i === this.selectedIndex ? "#ff0" : "#fff"); // 选中的变黄，其他变白
        });
    }
    //檢查防止無效選項
    checkAnswer(selectedAnswer, correctAnswer) {
        let centerX = this.cameras.main.centerX;
        let centerY = this.cameras.main.centerY;
        let screenWidth = this.cameras.main.width;
        let screenHeight = this.cameras.main.height;
        let gsize = Math.min(screenWidth, screenHeight);
        let allpasize = Math.max(20, gsize * 0.05);
        if (!selectedAnswer || !correctAnswer) return;
        selectedAnswer = selectedAnswer.trim();
        correctAnswer = correctAnswer.trim();

        if (selectedAnswer === correctAnswer) {
            this.resultText = this.add.text(centerX, centerY * 0.85, "曆害喔！", {
                fontSize: allpasize + "px", color: "#8B4513", padding: { x: 10, y: 5 }
            }).setOrigin(0.5);

            this.correctAnswersCount++; // 計數+1
            this.correctAnswersText.setText(`答對題数: ${this.correctAnswersCount} / ${this.passThreshold}`);
        } else {
            this.resultText = this.add.text(centerX, centerY * 0.85, "再加油！", {
                fontSize: allpasize + "px", color: "#708090", padding: { x: 10, y: 5 }
            }).setOrigin(0.5);

        }
        //秒數穩藏
        this.time.delayedCall(500, () => {
            this.questionText.destroy();
            this.answerButtons.forEach(btn => btn.destroy());
            this.resultText.destroy();

            //恢復遊戲
            this.physics.resume();
            this.obstacleTimer.paused = false;
            this.zongziTimer.paused = false;
            this.isAnswering = false;
            this.input.keyboard.enabled = false; // 禁用鍵盤輸入

            if (this.correctAnswersCount >= this.passThreshold) {
                this.showVictoryScreen();
            } else if (this.currentQuestionIndex >= this.totalQuestions) {
                // 如果已经回答完 10 题但未达到通过标准，则游戏失败
                this.showGameOverScreen();
            }
        });
    }

    showVictoryScreen() {
        let centerX = this.cameras.main.centerX;
        let centerY = this.cameras.main.centerY;
        let screenWidth = this.cameras.main.width;
        let screenHeight = this.cameras.main.height;
        let gsize = Math.min(screenWidth, screenHeight);
        let btnFontSize = Math.max(18, gsize * 0.04);
        let allpasize = Math.max(20, gsize * 0.05)
        this.graphics1 = this.add.graphics();
        this.graphics1.fillStyle(0x4169E1, 1);
        this.graphics1.fillRect(centerX - gsize * 0.5 / 2, centerY - gsize * 0.5 / 2, gsize * 0.5, gsize * 0.5);
        this.graphics1.setDepth(3)

        this.isGameOver = true;  // 结束禁用控制
        this.isWaterMoving = false;
        this.physics.pause();
        this.obstacleTimer.paused = true;
        this.zongziTimer.paused = true;
        // 禁用滑鼠鍵盤控制
        this.input.off('pointermove');
        // this.input.keyboard.enabled = false;
        // 問題和按钮不顯示
        if (this.questionText) {
            this.questionText.destroy();
            this.answerButtons.forEach(btn => btn.destroy());
        }
        //centerX,centerY .setOrigin(0.5)
        this.add.text(centerX, centerY - gsize * 0.18, "恭喜過關！", {
            fontSize: allpasize + "px",
            color: "#D2691E",
            fontFamily: 'Arial, sans-serif',
            //padding: { x: 20, y: 10 }
        }).setDepth(5).setOrigin(0.5);
        //過關時間
        let elapsedTime = (this.time.now - this.startTime) / 1000; // 轉換為秒
        let passtime = this.add.text(centerX, centerY - gsize * 0.1, '過關時間:' + elapsedTime.toFixed(0) + '秒', {
            fontSize: allpasize + "px",
            fill: '#fff',
            align: 'center',
            fontFamily: 'Arial, sans-serif'
        }).setDepth(5).setOrigin(0.5);

        // Google 表单按钮
        let button1 = this.createTextButton(centerX, centerY, "Google 表單", allpasize, () => {
            window.open('https://forms.gle/your-google-form-link', '_blank');
        });

        // 重新挑战按钮
        let button2 = this.createTextButton(centerX, centerY + gsize * 0.08, "再挑戰一次", allpasize, () => {
            this.restartGame();
        });
    }
    createTextButton(x, y, text, fontSize, callback) {
        let button = this.add.text(x, y, text, {
            fontSize: fontSize + "px",
            color: "#FFFFFF",
            fontFamily: "Arial, sans-serif",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(5).setInteractive();

        button.on("pointerdown", callback);
        button.on("pointerover", () => button.setStyle({ fill: "#FFD700" }));
        button.on("pointerout", () => button.setStyle({ fill: "#FFFFFF" }));
        return button;
    }

    showGameOverScreen() {
        let centerX = this.cameras.main.centerX;
        let centerY = this.cameras.main.centerY;
        let screenWidth = this.cameras.main.width;
        let screenHeight = this.cameras.main.height;
        // let gsize = Math.max(screenWidth, screenHeight);
        let gsize = Math.min(screenWidth, screenHeight);
        let btnFontSize = Math.max(18, gsize * 0.04);
        let allpasize = Math.max(20, gsize * 0.05)
        this.graphics1 = this.add.graphics();
        this.graphics1.fillStyle(0x4169E1, 1);
        this.graphics1.fillRect(centerX - gsize * 0.4 / 2, centerY - gsize * 0.4 / 2, gsize * 0.4, gsize * 0.4);
        this.graphics1.setDepth(3)
        this.isGameOver = true;  // 结束禁用控制
        this.isWaterMoving = false;
        this.physics.pause();
        this.obstacleTimer.paused = true;
        this.zongziTimer.paused = true;
        // 禁用滑鼠鍵盤控制
        this.input.off('pointermove');
        // this.input.keyboard.enabled = false;
        // 未能過關畫面
        this.add.text(centerX, centerY * 0.95, "再努力喔！", {
            fontSize: allpasize + "px",
            color: "#A52A2A",
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setDepth(5);

        // 重新挑战按钮
        let button2 = this.createTextButton(centerX, centerY + gsize * 0.08, "再挑戰一次", allpasize, () => {
            this.restartGame();
        });
    }

    createTextButton(x, y, text, fontSize, callback) {
        let button = this.add.text(x, y, text, {
            fontSize: fontSize + "px",
            color: "#FFFFFF",
            fontFamily: "Arial, sans-serif",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(5).setInteractive();

        button.on("pointerdown", callback);
        button.on("pointerover", () => button.setStyle({ fill: "#FFD700" }));
        button.on("pointerout", () => button.setStyle({ fill: "#FFFFFF" }));
        return button;
    }

    restartGame() {
        // 重置答对题数
        this.correctAnswersCount = 0;
        this.currentQuestionIndex = 0;
        this.elapsedTime = 0;

        // 恢复游戏状态
        this.isGameOver = false;
        this.isGameStarted = false;
        this.isWaterMoving = true;
        this.input.keyboard.removeAllListeners(); // 移除舊的監聽
        this.scene.start('DragonBoatGame'); // 重新啟動遊戲場景
        this.input.keyboard.enabled = true; // 重新啟用鍵盤
        this.input.keyboard._hasQuestionListeners = false; // **重置键盘监听状态**
        this.scene.restart();  // **重启场景**
    }

}
function resizeGame() {
    // 讀取大小
    let width = window.innerWidth;
    let height = window.innerHeight;

    // 调整大小
    game.scale.resize(width, height);

    // 更新畫面居中
    game.cameras.main.setBounds(0, 0, width, height);
    game.cameras.main.centerOn(width / 2, height / 2);
}



const config = {
    type: Phaser.AUTO,
    width: window.innerWidth, // 適配窗口
    height: window.innerHeight, // 適配窗口
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [DragonBoatGame]
};
const game = new Phaser.Game(config);
